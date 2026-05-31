import Foundation
import Security

final class KeychainStore {
    private let service: String

    init(service: String = Bundle.main.bundleIdentifier ?? "com.ds.ecommerce.mobile") {
        self.service = service
    }

    func read(account: String) -> Data? {
        let query = baseQuery(account: account).merging(
            [
                kSecReturnData as String: true,
                kSecMatchLimit as String: kSecMatchLimitOne,
            ],
            uniquingKeysWith: { _, new in new }
        )
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status == errSecSuccess else {
            return nil
        }
        return item as? Data
    }

    func write(_ data: Data, account: String) {
        let query = baseQuery(account: account)
        let attributes = [kSecValueData as String: data]
        let updateStatus = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if updateStatus == errSecSuccess {
            return
        }

        var insertQuery = query
        insertQuery[kSecValueData as String] = data
        SecItemDelete(query as CFDictionary)
        SecItemAdd(insertQuery as CFDictionary, nil)
    }

    func delete(account: String) {
        SecItemDelete(baseQuery(account: account) as CFDictionary)
    }

    private func baseQuery(account: String) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
    }
}
