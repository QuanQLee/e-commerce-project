import SwiftUI

@main
struct EcommerceMobileApp: App {
    @StateObject private var viewModel = AppViewModel(client: MobileAPIClient())

    var body: some Scene {
        WindowGroup {
            RootView(viewModel: viewModel)
                .onOpenURL { url in
                    viewModel.handleAuthRedirect(url)
                }
        }
    }
}
