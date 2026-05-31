package com.ds.ecommerce.mobile.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.ds.ecommerce.mobile.data.AppConfig
import com.ds.ecommerce.mobile.data.MobileRepository
import com.ds.ecommerce.mobile.data.OrderDto
import com.ds.ecommerce.mobile.data.ProductDto
import com.ds.ecommerce.mobile.data.SessionSnapshot
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.util.Locale

enum class DashboardTab {
    Products,
    Orders,
}

data class AppUiState(
    val username: String = AppConfig.defaultUsername,
    val password: String = "",
    val tenantId: String = AppConfig.defaultTenantId,
    val session: SessionSnapshot? = null,
    val isLoading: Boolean = false,
    val products: List<ProductDto> = emptyList(),
    val orders: List<OrderDto> = emptyList(),
    val selectedTab: DashboardTab = DashboardTab.Products,
    val errorMessage: String? = null,
    val infoMessage: String? = null,
    val pendingBrowserLoginUrl: String? = null,
) {
    val currencyFormatter: NumberFormat
        get() = NumberFormat.getCurrencyInstance(Locale.CHINA)
}

class AppViewModel(
    private val repository: MobileRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(AppUiState())
    val uiState: StateFlow<AppUiState> = _uiState.asStateFlow()

    init {
        bootstrap()
    }

    fun updateUsername(value: String) {
        _uiState.update { it.copy(username = value, errorMessage = null) }
    }

    fun updatePassword(value: String) {
        _uiState.update { it.copy(password = value, errorMessage = null) }
    }

    fun updateTenantId(value: String) {
        _uiState.update { it.copy(tenantId = value, errorMessage = null) }
    }

    fun selectTab(tab: DashboardTab) {
        _uiState.update { it.copy(selectedTab = tab) }
    }

    fun clearTransientMessage() {
        _uiState.update { it.copy(errorMessage = null, infoMessage = null) }
    }

    fun consumePendingBrowserLoginUrl() {
        _uiState.update { it.copy(pendingBrowserLoginUrl = null) }
    }

    fun login() {
        if (!AppConfig.allowPasswordGrantFallback) {
            _uiState.update {
                it.copy(errorMessage = "Password sign-in is disabled in this build. Use browser sign-in.")
            }
            return
        }
        val snapshot = uiState.value
        if (snapshot.username.isBlank() || snapshot.password.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Enter both username and password.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null, infoMessage = null) }
            runCatching {
                repository.login(
                    username = snapshot.username.trim(),
                    password = snapshot.password,
                    tenantId = snapshot.tenantId.trim().ifBlank { AppConfig.defaultTenantId },
                )
            }.onSuccess { session ->
                _uiState.update {
                    it.copy(
                        session = session,
                        tenantId = session.tenantId,
                        username = session.userName ?: snapshot.username,
                        password = "",
                    )
                }
                loadDashboard(infoMessage = "Signed in and synced products plus orders.")
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = error.message ?: "Sign-in failed.",
                    )
                }
            }
        }
    }

    fun beginBrowserLogin() {
        val normalizedTenantId = uiState.value.tenantId.trim().ifBlank { AppConfig.defaultTenantId }
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null, infoMessage = null) }
            runCatching {
                repository.beginBrowserLogin(normalizedTenantId)
            }.onSuccess { authorizeUrl ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        tenantId = normalizedTenantId,
                        pendingBrowserLoginUrl = authorizeUrl,
                        infoMessage = "Continue sign-in in your browser.",
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = error.message ?: "Browser sign-in could not be started.",
                    )
                }
            }
        }
    }

    fun handleAuthRedirect(redirectUrl: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null, infoMessage = null) }
            runCatching {
                repository.completeBrowserLogin(redirectUrl)
            }.onSuccess { session ->
                _uiState.update {
                    it.copy(
                        session = session,
                        tenantId = session.tenantId,
                        username = session.userName ?: it.username,
                        password = "",
                    )
                }
                loadDashboard(infoMessage = "Browser sign-in completed and data synced.")
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = error.message ?: "Browser sign-in failed.",
                    )
                }
            }
        }
    }

    fun refreshDashboard() {
        loadDashboard()
    }

    fun placeOrder(product: ProductDto) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null, infoMessage = null) }
            runCatching {
                repository.placeOrder(product)
            }.onSuccess { orderId ->
                val message = if (!orderId.isNullOrBlank()) {
                    "Order created: $orderId"
                } else {
                    "Order created."
                }
                loadDashboard(selectedTab = DashboardTab.Orders, infoMessage = message)
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = error.message ?: "Order creation failed.",
                    )
                }
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            repository.logout()
            _uiState.value = AppUiState(
                username = uiState.value.username,
                tenantId = uiState.value.tenantId,
                infoMessage = "Signed out.",
            )
        }
    }

    private fun bootstrap() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            runCatching { repository.restoreSession() }
                .onSuccess { session ->
                    if (session == null) {
                        _uiState.update { it.copy(isLoading = false) }
                    } else {
                        _uiState.update {
                            it.copy(
                                session = session,
                                username = session.userName ?: it.username,
                                tenantId = session.tenantId,
                            )
                        }
                        loadDashboard(infoMessage = "Restored the local mobile session.")
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = error.message ?: "Session restore failed.",
                        )
                    }
                }
        }
    }

    private fun loadDashboard(
        selectedTab: DashboardTab? = null,
        infoMessage: String? = null,
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null, infoMessage = null) }
            runCatching {
                val productsDeferred = async { repository.fetchProducts() }
                val ordersDeferred = async { repository.fetchOrders() }
                productsDeferred.await() to ordersDeferred.await()
            }.onSuccess { (products, orders) ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        products = products,
                        orders = orders.sortedByDescending(OrderDto::createdAt),
                        selectedTab = selectedTab ?: it.selectedTab,
                        infoMessage = infoMessage,
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = error.message ?: "Data sync failed.",
                    )
                }
            }
        }
    }

    companion object {
        fun factory(repository: MobileRepository): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    return AppViewModel(repository) as T
                }
            }
    }
}
