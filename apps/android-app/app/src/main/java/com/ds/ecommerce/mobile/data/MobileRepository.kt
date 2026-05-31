package com.ds.ecommerce.mobile.data

import android.net.Uri
import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import retrofit2.HttpException
import java.security.MessageDigest
import java.security.SecureRandom
import android.util.Base64

class MobileRepository(
    private val authApi: AuthApi,
    private val commerceApi: CommerceApi,
    private val sessionStore: SessionStore,
) {
    suspend fun restoreSession(): SessionSnapshot? {
        val session = sessionStore.load() ?: return null
        if (!session.isExpired) {
            return session
        }
        return refreshSession()
    }

    suspend fun login(username: String, password: String, tenantId: String): SessionSnapshot {
        val response = authApi.login(
            MobileLoginRequest(
                username = username,
                password = password,
                tenantId = tenantId,
            ),
        )
        sessionStore.save(response)
        return requireNotNull(sessionStore.load()) {
            "Mobile session was not persisted."
        }
    }

    suspend fun beginBrowserLogin(tenantId: String): String {
        val normalizedTenantId = tenantId.ifBlank { AppConfig.defaultTenantId }
        val codeVerifier = generateCodeVerifier()
        val state = generateState()
        val response = authApi.authorize(
            MobileAuthorizeRequest(
                redirectUri = AppConfig.mobileRedirectUri,
                codeChallenge = createCodeChallenge(codeVerifier),
                state = state,
                tenantId = normalizedTenantId,
            ),
        )
        sessionStore.savePendingAuth(
            PendingAuthState(
                codeVerifier = codeVerifier,
                state = state,
                tenantId = normalizedTenantId,
            ),
        )
        return response.authorizeUrl
    }

    suspend fun completeBrowserLogin(callbackUrl: String): SessionSnapshot {
        val callback = Uri.parse(callbackUrl)
        val authError = callback.getQueryParameter("error")
        if (!authError.isNullOrBlank()) {
            val description = callback.getQueryParameter("error_description") ?: authError
            sessionStore.clearPendingAuth()
            error(description)
        }

        val code = callback.getQueryParameter("code")?.trim().orEmpty()
        val state = callback.getQueryParameter("state")?.trim().orEmpty()
        val pending = sessionStore.loadPendingAuth() ?: error("No pending browser sign-in was found.")
        if (code.isBlank()) {
            sessionStore.clearPendingAuth()
            error("The browser callback did not include an authorization code.")
        }
        if (state.isBlank() || state != pending.state) {
            sessionStore.clearPendingAuth()
            error("The browser callback state did not match the pending mobile sign-in.")
        }

        val response = authApi.exchange(
            MobileExchangeRequest(
                code = code,
                codeVerifier = pending.codeVerifier,
                redirectUri = AppConfig.mobileRedirectUri,
                tenantId = pending.tenantId,
            ),
        )
        sessionStore.save(response)
        sessionStore.clearPendingAuth()
        return requireNotNull(sessionStore.load()) {
            "Mobile PKCE session was not persisted."
        }
    }

    suspend fun logout() {
        sessionStore.clear()
    }

    suspend fun fetchProducts(): List<ProductDto> =
        executeWithRefresh { commerceApi.getProducts() }

    suspend fun fetchOrders(): List<OrderDto> =
        executeWithRefresh { commerceApi.getOrders() }

    suspend fun placeOrder(product: ProductDto): String? =
        executeWithRefresh {
            withContext(Dispatchers.IO) {
                commerceApi.createOrder(
                    CreateOrderRequest(
                        items = listOf(
                            CreateOrderItemRequest(
                                productName = product.name,
                                price = product.price,
                            ),
                        ),
                        total = product.price,
                    ),
                ).use { body ->
                    body.string().trim().trim('"')
                }
            }
        }

    private suspend fun refreshSession(): SessionSnapshot? {
        val session = sessionStore.load() ?: return null
        val refreshToken = session.refreshToken ?: return null
        val response = authApi.refresh(
            MobileRefreshRequest(
                refreshToken = refreshToken,
                tenantId = session.tenantId,
                oauthClientId = session.oauthClientId,
            ),
        )
        sessionStore.save(response)
        return sessionStore.load()
    }

    private suspend fun <T> executeWithRefresh(block: suspend () -> T): T {
        try {
            return block()
        } catch (error: HttpException) {
            if (error.code() != 401 || refreshSession() == null) {
                throw error
            }
            return block()
        }
    }

    companion object {
        private val secureRandom = SecureRandom()

        fun create(context: Context): MobileRepository {
            val store = SessionStore(context)
            return MobileRepository(
                authApi = MobileApiFactory.createAuthApi(),
                commerceApi = MobileApiFactory.createCommerceApi(store),
                sessionStore = store,
            )
        }

        private fun generateCodeVerifier(): String {
            val bytes = ByteArray(32)
            secureRandom.nextBytes(bytes)
            return Base64.encodeToString(
                bytes,
                Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP,
            )
        }

        private fun generateState(): String {
            val bytes = ByteArray(24)
            secureRandom.nextBytes(bytes)
            return Base64.encodeToString(
                bytes,
                Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP,
            )
        }

        private fun createCodeChallenge(codeVerifier: String): String {
            val digest = MessageDigest.getInstance("SHA-256")
                .digest(codeVerifier.toByteArray(Charsets.UTF_8))
            return Base64.encodeToString(
                digest,
                Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP,
            )
        }
    }
}
