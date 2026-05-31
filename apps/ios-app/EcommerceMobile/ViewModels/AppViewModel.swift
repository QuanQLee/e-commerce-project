import Foundation

@MainActor
final class AppViewModel: ObservableObject {
    @Published var username: String = AppConfig.defaultUsername
    @Published var password: String = ""
    @Published var tenantId: String = AppConfig.defaultTenantId
    @Published var session: SessionSnapshot?
    @Published var products: [Product] = []
    @Published var orders: [Order] = []
    @Published var selectedTab: DashboardTab = .products
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var infoMessage: String?

    private let client: MobileAPIClient

    init(client: MobileAPIClient) {
        self.client = client
        bootstrap()
    }

    func login() {
        guard AppConfig.allowPasswordGrantFallback else {
            errorMessage = "Password sign-in is disabled in this build. Use browser sign-in."
            return
        }
        guard !username.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              !password.isEmpty else {
            errorMessage = "Enter both username and password."
            return
        }

        Task {
            isLoading = true
            clearMessages()
            do {
                let session = try await client.login(
                    username: username.trimmingCharacters(in: .whitespacesAndNewlines),
                    password: password,
                    tenantId: tenantId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? AppConfig.defaultTenantId : tenantId
                )
                self.session = session
                self.username = session.userName ?? username
                self.tenantId = session.tenantId
                self.password = ""
                await loadDashboard(info: "Signed in and synced products plus orders.")
            } catch {
                isLoading = false
                errorMessage = error.localizedDescription
            }
        }
    }

    func beginBrowserLogin() async -> URL? {
        isLoading = true
        clearMessages()
        do {
            let normalizedTenantId = tenantId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                ? AppConfig.defaultTenantId
                : tenantId.trimmingCharacters(in: .whitespacesAndNewlines)
            let url = try await client.prepareBrowserLogin(tenantId: normalizedTenantId)
            tenantId = normalizedTenantId
            isLoading = false
            infoMessage = "Continue sign-in in your browser."
            return url
        } catch {
            isLoading = false
            errorMessage = error.localizedDescription
            return nil
        }
    }

    func handleAuthRedirect(_ url: URL) {
        Task {
            isLoading = true
            clearMessages()
            do {
                let session = try await client.completeBrowserLogin(callbackURL: url)
                self.session = session
                self.username = session.userName ?? username
                self.tenantId = session.tenantId
                self.password = ""
                await loadDashboard(info: "Browser sign-in completed and data synced.")
            } catch {
                isLoading = false
                errorMessage = error.localizedDescription
            }
        }
    }

    func refresh() {
        Task {
            await loadDashboard()
        }
    }

    func placeOrder(_ product: Product) {
        Task {
            isLoading = true
            clearMessages()
            do {
                let orderId = try await client.placeOrder(for: product)
                await loadDashboard(selectedTab: .orders, info: orderId.map { "Order created: \($0)" } ?? "Order created.")
            } catch {
                isLoading = false
                errorMessage = error.localizedDescription
            }
        }
    }

    func logout() {
        client.logout()
        session = nil
        products = []
        orders = []
        password = ""
        infoMessage = "Signed out."
        errorMessage = nil
    }

    func dismissMessages() {
        clearMessages()
    }

    private func bootstrap() {
        Task {
            isLoading = true
            do {
                if let restored = try await client.restoreSession() {
                    session = restored
                    username = restored.userName ?? username
                    tenantId = restored.tenantId
                    await loadDashboard(info: "Restored the local mobile session.")
                } else {
                    isLoading = false
                }
            } catch {
                isLoading = false
                errorMessage = error.localizedDescription
            }
        }
    }

    private func loadDashboard(
        selectedTab: DashboardTab? = nil,
        info: String? = nil
    ) async {
        isLoading = true
        clearMessages()
        do {
            async let productsTask = client.fetchProducts()
            async let ordersTask = client.fetchOrders()
            let (products, orders) = try await (productsTask, ordersTask)
            self.products = products
            self.orders = orders.sorted { $0.createdAt > $1.createdAt }
            if let selectedTab {
                self.selectedTab = selectedTab
            }
            infoMessage = info
            isLoading = false
        } catch {
            isLoading = false
            errorMessage = error.localizedDescription
        }
    }

    private func clearMessages() {
        errorMessage = nil
        infoMessage = nil
    }
}

enum DashboardTab: String, CaseIterable, Identifiable {
    case products = "Products"
    case orders = "Orders"

    var id: String { rawValue }
}
