import SwiftUI

struct RootView: View {
    @ObservedObject var viewModel: AppViewModel

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.session == nil {
                    LoginView(viewModel: viewModel)
                } else {
                    DashboardView(viewModel: viewModel)
                }
            }
            .overlay(alignment: .center) {
                if viewModel.isLoading {
                    ProgressView()
                        .padding()
                        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
                }
            }
        }
    }
}

private struct LoginView: View {
    @ObservedObject var viewModel: AppViewModel
    @Environment(\.openURL) private var openURL

    var body: some View {
        Form {
            Section("DS Mobile") {
                Text("Shared backend entry: \(AppConfig.defaultBaseURLString)")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                TextField("Tenant", text: $viewModel.tenantId)
                    .textInputAutocapitalization(.never)
                Button("Continue in browser") {
                    Task {
                        if let url = await viewModel.beginBrowserLogin() {
                            openURL(url)
                        }
                    }
                }
                .disabled(viewModel.isLoading)
                Text("Release builds use OIDC PKCE through the shared Gateway/Bff entry.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                if AppConfig.allowPasswordGrantFallback {
                    TextField("Username", text: $viewModel.username)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    SecureField("Password", text: $viewModel.password)
                }
            }

            if let infoMessage = viewModel.infoMessage {
                Section {
                    Text(infoMessage)
                        .foregroundStyle(.blue)
                }
            }

            if let errorMessage = viewModel.errorMessage {
                Section {
                    Text(errorMessage)
                        .foregroundStyle(.red)
                }
            }

            if AppConfig.allowPasswordGrantFallback {
                Section {
                    Button("Use local password sign-in") {
                        viewModel.login()
                    }
                    .disabled(viewModel.isLoading)
                }
            }

            Section {
                Text("The iOS simulator uses localhost. Use your workstation LAN IP on a real iPhone. Password sign-in stays debug-only.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Sign in")
    }
}

private struct DashboardView: View {
    @ObservedObject var viewModel: AppViewModel

    var body: some View {
        List {
            Section("Session") {
                Text("Tenant: \(viewModel.session?.tenantId ?? viewModel.tenantId)")
                Text("API: \(AppConfig.defaultBaseURLString)")
                Text("Products \(viewModel.products.count), orders \(viewModel.orders.count)")

                if let infoMessage = viewModel.infoMessage {
                    Text(infoMessage)
                        .foregroundStyle(.blue)
                }

                if let errorMessage = viewModel.errorMessage {
                    Text(errorMessage)
                        .foregroundStyle(.red)
                }
            }

            Section("View") {
                Picker("Tab", selection: $viewModel.selectedTab) {
                    ForEach(DashboardTab.allCases) { tab in
                        Text(tab.rawValue).tag(tab)
                    }
                }
                .pickerStyle(.segmented)
            }

            switch viewModel.selectedTab {
            case .products:
                Section("Products") {
                    ForEach(viewModel.products) { product in
                        VStack(alignment: .leading, spacing: 8) {
                            Text(product.name)
                                .font(.headline)
                            Text(product.category)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                            Text(product.description)
                                .font(.body)
                            HStack {
                                Text(product.price, format: .currency(code: "CNY"))
                                    .font(.title3)
                                    .foregroundStyle(.blue)
                                Spacer()
                                Text("Stock \(product.stock)")
                                    .foregroundStyle(.secondary)
                            }
                            Button("Buy now") {
                                viewModel.placeOrder(product)
                            }
                            .disabled(product.stock <= 0 || viewModel.isLoading)
                        }
                        .padding(.vertical, 4)
                    }
                }
            case .orders:
                Section("Orders") {
                    if viewModel.orders.isEmpty {
                        Text("No orders yet.")
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(viewModel.orders) { order in
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Order \(String(order.id.prefix(8)))")
                                    .font(.headline)
                                Text("Status \(order.status)")
                                Text("Created \(String(order.createdAt.prefix(19)))")
                                    .foregroundStyle(.secondary)
                                Text(order.totalPrice, format: .currency(code: "CNY"))
                                    .foregroundStyle(.blue)
                                ForEach(order.items) { item in
                                    Text("\(item.productName) - \(item.price, format: .currency(code: "CNY"))")
                                        .font(.subheadline)
                                }
                            }
                            .padding(.vertical, 4)
                        }
                    }
                }
            }
        }
        .navigationTitle(viewModel.session?.userName ?? "DS Mobile")
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button("Refresh") {
                    viewModel.refresh()
                }
                Button("Sign out") {
                    viewModel.logout()
                }
            }
        }
        .onChange(of: viewModel.selectedTab) { _, _ in
            viewModel.dismissMessages()
        }
    }
}
