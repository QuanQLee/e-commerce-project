import Foundation

struct MobileLoginRequest: Codable {
    let username: String
    let password: String
    let tenantId: String
    let scope: String = AppConfig.defaultScope

    enum CodingKeys: String, CodingKey {
        case username
        case password
        case tenantId = "tenant_id"
        case scope
    }
}

struct MobileRefreshRequest: Codable {
    let refreshToken: String
    let tenantId: String
    let oauthClientId: String
    let scope: String = AppConfig.defaultScope

    enum CodingKeys: String, CodingKey {
        case refreshToken = "refresh_token"
        case tenantId = "tenant_id"
        case oauthClientId = "oauth_client_id"
        case scope
    }
}

struct MobileAuthorizeRequest: Codable {
    let redirectUri: String
    let codeChallenge: String
    let state: String
    let tenantId: String
    let scope: String = AppConfig.defaultOidcScope

    enum CodingKeys: String, CodingKey {
        case redirectUri = "redirect_uri"
        case codeChallenge = "code_challenge"
        case state
        case tenantId = "tenant_id"
        case scope
    }
}

struct MobileAuthorizeResponse: Codable {
    let authorizeURL: URL
    let clientId: String
    let redirectUri: String
    let tenantId: String
    let state: String

    enum CodingKeys: String, CodingKey {
        case authorizeURL = "authorize_url"
        case clientId = "client_id"
        case redirectUri = "redirect_uri"
        case tenantId = "tenant_id"
        case state
    }
}

struct MobileExchangeRequest: Codable {
    let code: String
    let codeVerifier: String
    let redirectUri: String
    let tenantId: String

    enum CodingKeys: String, CodingKey {
        case code
        case codeVerifier = "code_verifier"
        case redirectUri = "redirect_uri"
        case tenantId = "tenant_id"
    }
}

struct MobileUserProfile: Codable {
    let id: String
    let authSubjectId: String?
    let userName: String
    let email: String?
    let tenantId: String

    enum CodingKeys: String, CodingKey {
        case id
        case authSubjectId = "auth_subject_id"
        case userName = "user_name"
        case email
        case tenantId = "tenant_id"
    }
}

struct MobileTokenResponse: Codable {
    let accessToken: String
    let refreshToken: String?
    let tokenType: String
    let expiresIn: Int
    let expiresAt: Int64
    let scope: String
    let tenantId: String
    let oauthClientId: String
    let user: MobileUserProfile?

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case tokenType = "token_type"
        case expiresIn = "expires_in"
        case expiresAt = "expires_at"
        case scope
        case tenantId = "tenant_id"
        case oauthClientId = "oauth_client_id"
        case user
    }
}

struct Product: Codable, Identifiable {
    let id: String
    let tenantId: String?
    let name: String
    let description: String
    let price: Double
    let imageUrl: String?
    let category: String
    let stock: Int

    enum CodingKeys: String, CodingKey {
        case id
        case tenantId
        case name
        case description
        case price
        case imageUrl
        case category
        case stock
    }
}

struct OrderItem: Codable, Identifiable {
    let id: String
    let orderId: String?
    let tenantId: String?
    let productName: String
    let price: Double

    enum CodingKeys: String, CodingKey {
        case id
        case orderId
        case tenantId
        case productName
        case price
    }
}

struct Order: Codable, Identifiable {
    let id: String
    let tenantId: String?
    let userId: String
    let items: [OrderItem]
    let totalPrice: Double
    let status: String
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case tenantId
        case userId
        case items
        case totalPrice
        case status
        case createdAt
    }
}

struct CreateOrderItemRequest: Codable {
    let productName: String
    let price: Double

    enum CodingKeys: String, CodingKey {
        case productName
        case price
    }
}

struct CreateOrderRequest: Codable {
    let items: [CreateOrderItemRequest]
    let total: Double

    enum CodingKeys: String, CodingKey {
        case items
        case total
    }
}

struct PendingAuthState: Codable {
    let codeVerifier: String
    let state: String
    let tenantId: String
}

struct SessionSnapshot: Codable {
    let accessToken: String
    let refreshToken: String?
    let tokenType: String
    let expiresAt: Int64
    let scope: String
    let tenantId: String
    let oauthClientId: String
    let userId: String?
    let authSubjectId: String?
    let userName: String?
    let email: String?

    enum CodingKeys: String, CodingKey {
        case accessToken
        case refreshToken
        case tokenType
        case expiresAt
        case scope
        case tenantId
        case userId
        case oauthClientId
        case authSubjectId
        case userName
        case email
    }

    var isExpired: Bool {
        expiresAt <= Int64(Date().timeIntervalSince1970)
    }
}
