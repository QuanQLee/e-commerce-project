import CryptoKit
import Foundation

enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case unauthorized
    case notAuthenticated
    case invalidCallback
    case missingPendingBrowserLogin
    case callbackStateMismatch
    case server(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid API URL."
        case .invalidResponse:
            return "Invalid server response."
        case .unauthorized:
            return "Authentication failed."
        case .notAuthenticated:
            return "No active mobile session."
        case .invalidCallback:
            return "The browser callback was invalid."
        case .missingPendingBrowserLogin:
            return "No pending browser sign-in was found."
        case .callbackStateMismatch:
            return "The browser callback state did not match the pending sign-in."
        case .server(let message):
            return message
        }
    }
}

final class MobileAPIClient {
    private let baseURL: URL
    private let urlSession: URLSession
    private let sessionStore: SessionStore
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    init(
        baseURL: URL = AppConfig.baseURL,
        urlSession: URLSession = .shared,
        sessionStore: SessionStore = SessionStore()
    ) {
        self.baseURL = baseURL
        self.urlSession = urlSession
        self.sessionStore = sessionStore

        self.decoder = JSONDecoder()
        self.encoder = JSONEncoder()
    }

    func currentSession() -> SessionSnapshot? {
        sessionStore.load()
    }

    func restoreSession() async throws -> SessionSnapshot? {
        guard let session = sessionStore.load() else {
            return nil
        }
        if session.isExpired {
            return try await refreshSession()
        }
        return session
    }

    func login(username: String, password: String, tenantId: String) async throws -> SessionSnapshot {
        let request = MobileLoginRequest(
            username: username,
            password: password,
            tenantId: tenantId
        )
        let response: MobileTokenResponse = try await send(
            path: "/auth/mobile/login",
            method: "POST",
            body: request,
            requiresAuth: false
        )
        sessionStore.save(response: response)
        guard let session = sessionStore.load() else {
            throw APIError.invalidResponse
        }
        return session
    }

    func prepareBrowserLogin(tenantId: String) async throws -> URL {
        let verifier = Self.generateCodeVerifier()
        let state = Self.generateState()
        let request = MobileAuthorizeRequest(
            redirectUri: AppConfig.mobileRedirectURIString,
            codeChallenge: Self.createCodeChallenge(verifier),
            state: state,
            tenantId: tenantId
        )
        let response: MobileAuthorizeResponse = try await send(
            path: "/auth/mobile/authorize",
            method: "POST",
            body: request,
            requiresAuth: false
        )
        sessionStore.savePendingAuth(
            PendingAuthState(
                codeVerifier: verifier,
                state: state,
                tenantId: tenantId
            )
        )
        return response.authorizeURL
    }

    func completeBrowserLogin(callbackURL: URL) async throws -> SessionSnapshot {
        guard let components = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false) else {
            throw APIError.invalidCallback
        }
        if let authError = components.queryItems?.first(where: { $0.name == "error" })?.value,
           !authError.isEmpty {
            let description = components.queryItems?.first(where: { $0.name == "error_description" })?.value ?? authError
            sessionStore.clearPendingAuth()
            throw APIError.server(description)
        }

        guard let code = components.queryItems?.first(where: { $0.name == "code" })?.value,
              !code.isEmpty,
              let state = components.queryItems?.first(where: { $0.name == "state" })?.value,
              !state.isEmpty else {
            sessionStore.clearPendingAuth()
            throw APIError.invalidCallback
        }

        guard let pending = sessionStore.loadPendingAuth() else {
            throw APIError.missingPendingBrowserLogin
        }
        guard pending.state == state else {
            sessionStore.clearPendingAuth()
            throw APIError.callbackStateMismatch
        }

        let request = MobileExchangeRequest(
            code: code,
            codeVerifier: pending.codeVerifier,
            redirectUri: AppConfig.mobileRedirectURIString,
            tenantId: pending.tenantId
        )
        let response: MobileTokenResponse = try await send(
            path: "/auth/mobile/exchange",
            method: "POST",
            body: request,
            requiresAuth: false
        )
        sessionStore.save(response: response)
        sessionStore.clearPendingAuth()
        guard let session = sessionStore.load() else {
            throw APIError.invalidResponse
        }
        return session
    }

    func refreshSession() async throws -> SessionSnapshot? {
        guard let session = sessionStore.load(),
              let refreshToken = session.refreshToken else {
            return nil
        }

        let request = MobileRefreshRequest(
            refreshToken: refreshToken,
            tenantId: session.tenantId,
            oauthClientId: session.oauthClientId
        )
        let response: MobileTokenResponse = try await send(
            path: "/auth/mobile/refresh",
            method: "POST",
            body: request,
            requiresAuth: false
        )
        sessionStore.save(response: response)
        return sessionStore.load()
    }

    func logout() {
        sessionStore.clear()
    }

    func fetchProducts() async throws -> [Product] {
        try await executeWithRefresh {
            try await self.send(path: "/api/v1/catalog/products", method: "GET")
        }
    }

    func fetchOrders() async throws -> [Order] {
        try await executeWithRefresh {
            try await self.send(path: "/api/v1/order/orders", method: "GET")
        }
    }

    func placeOrder(for product: Product) async throws -> String? {
        try await executeWithRefresh {
            let request = CreateOrderRequest(
                items: [
                    CreateOrderItemRequest(
                        productName: product.name,
                        price: product.price
                    )
                ],
                total: product.price
            )

            let data = try await self.sendData(
                path: "/api/v1/order/orders",
                method: "POST",
                body: request,
                requiresAuth: true
            )
            return String(data: data, encoding: .utf8)?
                .trimmingCharacters(in: CharacterSet(charactersIn: "\" \n\r\t"))
        }
    }

    private func executeWithRefresh<T>(_ operation: () async throws -> T) async throws -> T {
        do {
            return try await operation()
        } catch APIError.unauthorized {
            guard try await refreshSession() != nil else {
                throw APIError.unauthorized
            }
            return try await operation()
        }
    }

    private func send<T: Decodable>(
        path: String,
        method: String,
        requiresAuth: Bool = true
    ) async throws -> T {
        let data = try await sendData(
            path: path,
            method: method,
            requiresAuth: requiresAuth
        )
        return try decoder.decode(T.self, from: data)
    }

    private func send<T: Decodable, Body: Encodable>(
        path: String,
        method: String,
        body: Body,
        requiresAuth: Bool = true
    ) async throws -> T {
        let data = try await sendData(
            path: path,
            method: method,
            body: body,
            requiresAuth: requiresAuth
        )
        return try decoder.decode(T.self, from: data)
    }

    private func sendData(
        path: String,
        method: String,
        requiresAuth: Bool = true
    ) async throws -> Data {
        guard let url = URL(string: path, relativeTo: baseURL) else {
            throw APIError.invalidURL
        }

        return try await sendData(
            url: url,
            method: method,
            requiresAuth: requiresAuth
        )
    }

    private func sendData(
        url: URL,
        method: String,
        requiresAuth: Bool = true
    ) async throws -> Data {
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        if requiresAuth {
            guard let session = sessionStore.load() else {
                throw APIError.notAuthenticated
            }
            request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
            request.setValue(session.tenantId, forHTTPHeaderField: "X-Tenant-Id")
        }

        let (data, response) = try await urlSession.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        switch http.statusCode {
        case 200 ... 299:
            return data
        case 401:
            throw APIError.unauthorized
        default:
            let message = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines)
            throw APIError.server(message?.isEmpty == false ? message! : "Server error \(http.statusCode)")
        }
    }

    private func sendData<Body: Encodable>(
        path: String,
        method: String,
        body: Body,
        requiresAuth: Bool = true
    ) async throws -> Data {
        guard let url = URL(string: path, relativeTo: baseURL) else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.httpBody = try encoder.encode(body)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if requiresAuth {
            guard let session = sessionStore.load() else {
                throw APIError.notAuthenticated
            }
            request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
            request.setValue(session.tenantId, forHTTPHeaderField: "X-Tenant-Id")
        }

        let (data, response) = try await urlSession.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        switch http.statusCode {
        case 200 ... 299:
            return data
        case 401:
            throw APIError.unauthorized
        default:
            let message = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines)
            throw APIError.server(message?.isEmpty == false ? message! : "Server error \(http.statusCode)")
        }
    }

    private static func generateCodeVerifier() -> String {
        Data((0..<32).map { _ in UInt8.random(in: 0...255) })
            .base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    private static func generateState() -> String {
        Data((0..<24).map { _ in UInt8.random(in: 0...255) })
            .base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    private static func createCodeChallenge(_ codeVerifier: String) -> String {
        let digest = SHA256.hash(data: Data(codeVerifier.utf8))
        return Data(digest)
            .base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}
