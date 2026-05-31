import Foundation

final class SessionStore {
    private let sessionAccount = "com.ds.ecommerce.mobile.session"
    private let pendingAuthAccount = "com.ds.ecommerce.mobile.pending-auth"
    private let keychain: KeychainStore
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    init(keychain: KeychainStore = KeychainStore()) {
        self.keychain = keychain
    }

    func load() -> SessionSnapshot? {
        guard let data = keychain.read(account: sessionAccount) else {
            return nil
        }
        return try? decoder.decode(SessionSnapshot.self, from: data)
    }

    func save(response: MobileTokenResponse) {
        let existing = load()
        let merged = SessionSnapshot(
            accessToken: response.accessToken,
            refreshToken: response.refreshToken ?? existing?.refreshToken,
            tokenType: response.tokenType,
            expiresAt: response.expiresAt,
            scope: response.scope,
            tenantId: response.tenantId,
            oauthClientId: response.oauthClientId,
            userId: response.user?.id ?? existing?.userId,
            authSubjectId: response.user?.authSubjectId ?? existing?.authSubjectId,
            userName: response.user?.userName ?? existing?.userName,
            email: response.user?.email ?? existing?.email
        )
        guard let data = try? encoder.encode(merged) else {
            return
        }
        keychain.write(data, account: sessionAccount)
    }

    func savePendingAuth(_ pendingAuth: PendingAuthState) {
        guard let data = try? encoder.encode(pendingAuth) else {
            return
        }
        keychain.write(data, account: pendingAuthAccount)
    }

    func loadPendingAuth() -> PendingAuthState? {
        guard let data = keychain.read(account: pendingAuthAccount) else {
            return nil
        }
        return try? decoder.decode(PendingAuthState.self, from: data)
    }

    func clearPendingAuth() {
        keychain.delete(account: pendingAuthAccount)
    }

    func clear() {
        keychain.delete(account: sessionAccount)
        keychain.delete(account: pendingAuthAccount)
    }
}
