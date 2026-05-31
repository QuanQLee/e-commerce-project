package com.ds.ecommerce.mobile.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.ds.ecommerce.mobile.data.AppConfig
import com.ds.ecommerce.mobile.data.OrderDto
import com.ds.ecommerce.mobile.data.ProductDto

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppScreen(
    viewModel: AppViewModel,
    authRedirectUrl: String?,
    onAuthRedirectConsumed: () -> Unit,
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current

    LaunchedEffect(state.pendingBrowserLoginUrl) {
        val authorizeUrl = state.pendingBrowserLoginUrl ?: return@LaunchedEffect
        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(authorizeUrl)))
        viewModel.consumePendingBrowserLoginUrl()
    }

    LaunchedEffect(authRedirectUrl) {
        val redirectUrl = authRedirectUrl ?: return@LaunchedEffect
        viewModel.handleAuthRedirect(redirectUrl)
        onAuthRedirectConsumed()
    }

    MaterialTheme {
        Surface(modifier = Modifier.fillMaxSize()) {
            if (state.session == null) {
                LoginScreen(
                    state = state,
                    onUsernameChange = viewModel::updateUsername,
                    onPasswordChange = viewModel::updatePassword,
                    onTenantChange = viewModel::updateTenantId,
                    onBrowserLogin = viewModel::beginBrowserLogin,
                    onLogin = viewModel::login,
                )
            } else {
                DashboardScreen(
                    state = state,
                    onRefresh = viewModel::refreshDashboard,
                    onLogout = viewModel::logout,
                    onBuyNow = viewModel::placeOrder,
                    onSelectTab = viewModel::selectTab,
                    onDismissMessage = viewModel::clearTransientMessage,
                )
            }
        }
    }
}

@Composable
private fun LoginScreen(
    state: AppUiState,
    onUsernameChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onTenantChange: (String) -> Unit,
    onBrowserLogin: () -> Unit,
    onLogin: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        contentAlignment = Alignment.Center,
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text(
                    text = "DS Mobile",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = "Shared backend entry: ${AppConfig.apiBaseUrl}",
                    style = MaterialTheme.typography.bodyMedium,
                )
                OutlinedTextField(
                    value = state.tenantId,
                    onValueChange = onTenantChange,
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Tenant") },
                    singleLine = true,
                )
                Button(
                    onClick = onBrowserLogin,
                    enabled = !state.isLoading,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("Continue in browser")
                }
                Text(
                    text = "Release builds use OIDC PKCE through the shared Gateway/Bff entry.",
                    style = MaterialTheme.typography.bodySmall,
                )
                if (AppConfig.allowPasswordGrantFallback) {
                    OutlinedTextField(
                        value = state.username,
                        onValueChange = onUsernameChange,
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Username") },
                        singleLine = true,
                    )
                    OutlinedTextField(
                        value = state.password,
                        onValueChange = onPasswordChange,
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Password") },
                        singleLine = true,
                        visualTransformation = PasswordVisualTransformation(),
                    )
                }
                state.errorMessage?.let {
                    Text(
                        text = it,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
                state.infoMessage?.let {
                    Text(
                        text = it,
                        color = MaterialTheme.colorScheme.primary,
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
                if (AppConfig.allowPasswordGrantFallback) {
                    Button(
                        onClick = onLogin,
                        enabled = !state.isLoading,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        if (state.isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.height(18.dp),
                                strokeWidth = 2.dp,
                            )
                        } else {
                            Text("Use local password sign-in")
                        }
                    }
                } else if (state.isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.height(18.dp),
                        strokeWidth = 2.dp,
                    )
                }
                Text(
                    text = "Local Android emulators should use 10.0.2.2 and go through Gateway/Bff. Password sign-in stays debug-only.",
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DashboardScreen(
    state: AppUiState,
    onRefresh: () -> Unit,
    onLogout: () -> Unit,
    onBuyNow: (ProductDto) -> Unit,
    onSelectTab: (DashboardTab) -> Unit,
    onDismissMessage: () -> Unit,
) {
    val selectedIndex = if (state.selectedTab == DashboardTab.Products) 0 else 1

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(text = state.session?.userName ?: "DS Mobile")
                },
                actions = {
                    TextButton(onClick = onRefresh, enabled = !state.isLoading) {
                        Text("Refresh")
                    }
                    TextButton(onClick = onLogout) {
                        Text("Sign out")
                    }
                },
            )
        },
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues),
        ) {
            SessionSummary(state = state, onDismissMessage = onDismissMessage)
            TabRow(selectedTabIndex = selectedIndex) {
                Tab(
                    selected = selectedIndex == 0,
                    onClick = { onSelectTab(DashboardTab.Products) },
                    text = { Text("Products") },
                )
                Tab(
                    selected = selectedIndex == 1,
                    onClick = { onSelectTab(DashboardTab.Orders) },
                    text = { Text("Orders") },
                )
            }
            if (state.isLoading) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(24.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator()
                }
            } else {
                when (state.selectedTab) {
                    DashboardTab.Products -> ProductList(
                        state = state,
                        onBuyNow = onBuyNow,
                    )
                    DashboardTab.Orders -> OrderList(orders = state.orders)
                }
            }
        }
    }
}

@Composable
private fun SessionSummary(
    state: AppUiState,
    onDismissMessage: () -> Unit,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Text("Tenant: ${state.session?.tenantId ?: state.tenantId}")
            Text("API: ${AppConfig.apiBaseUrl}")
            Text("Products ${state.products.size}, orders ${state.orders.size}")
            state.infoMessage?.let {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = it,
                        color = MaterialTheme.colorScheme.primary,
                        style = MaterialTheme.typography.bodyMedium,
                    )
                    TextButton(onClick = onDismissMessage) {
                        Text("Dismiss")
                    }
                }
            }
            state.errorMessage?.let {
                Text(
                    text = it,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }
    }
}

@Composable
private fun ProductList(
    state: AppUiState,
    onBuyNow: (ProductDto) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        items(state.products, key = { it.id }) { product ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(product.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(product.category, style = MaterialTheme.typography.labelMedium)
                    Text(product.description, style = MaterialTheme.typography.bodyMedium)
                    HorizontalDivider()
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column {
                            Text(
                                text = state.currencyFormatter.format(product.price),
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.primary,
                            )
                            Text("Stock ${product.stock}")
                        }
                        Button(
                            onClick = { onBuyNow(product) },
                            enabled = product.stock > 0 && !state.isLoading,
                        ) {
                            Text("Buy now")
                        }
                    }
                }
            }
        }
        item {
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun OrderList(orders: List<OrderDto>) {
    if (orders.isEmpty()) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text("No orders yet.")
        }
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        items(orders, key = { it.id }) { order ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(
                        text = "Order ${order.id.take(8)}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )
                    Text("Status ${order.status}")
                    Text("Created ${order.createdAt.take(19)}")
                    Text("Total ${"%.2f".format(order.totalPrice)} CNY")
                    HorizontalDivider()
                    order.items.forEach { item ->
                        Text("${item.productName} - ${"%.2f".format(item.price)} CNY")
                    }
                }
            }
        }
        item {
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
