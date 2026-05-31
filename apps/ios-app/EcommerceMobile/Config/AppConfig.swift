import Foundation

enum AppConfig {
    private static let info = Bundle.main.infoDictionary ?? [:]

    static let defaultBaseURLString = info["APIBaseURL"] as? String ?? "https://api.example.com"
    static let defaultTenantId = info["DefaultTenantId"] as? String ?? "public"
    static let defaultUsername = info["DefaultUsername"] as? String ?? ""
    static let defaultScope = "api1 offline_access"
    static let defaultOidcScope = "openid profile api1 offline_access"
    static let mobileRedirectURIString = "dsmobile://auth/callback"

    static var allowPasswordGrantFallback: Bool {
        info["AllowPasswordGrantFallback"] as? Bool ?? false
    }

    static var baseURL: URL {
        guard let url = URL(string: defaultBaseURLString) else {
            preconditionFailure("Invalid API base URL: \(defaultBaseURLString)")
        }
#if !DEBUG
        guard url.scheme == "https", url.host != "api.example.com" else {
            preconditionFailure("Release builds must configure a real https API base URL.")
        }
#endif
        return url
    }

    static var mobileRedirectURL: URL {
        guard let url = URL(string: mobileRedirectURIString) else {
            preconditionFailure("Invalid mobile redirect URI: \(mobileRedirectURIString)")
        }
        return url
    }
}
