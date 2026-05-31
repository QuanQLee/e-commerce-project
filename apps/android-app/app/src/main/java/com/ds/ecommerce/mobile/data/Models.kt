package com.ds.ecommerce.mobile.data

import com.google.gson.annotations.SerializedName

data class MobileLoginRequest(
    val username: String,
    val password: String,
    @SerializedName("tenant_id") val tenantId: String,
    val scope: String = AppConfig.defaultScope,
)

data class MobileRefreshRequest(
    @SerializedName("refresh_token") val refreshToken: String,
    @SerializedName("tenant_id") val tenantId: String,
    @SerializedName("oauth_client_id") val oauthClientId: String,
    val scope: String = AppConfig.defaultScope,
)

data class MobileAuthorizeRequest(
    @SerializedName("redirect_uri") val redirectUri: String,
    @SerializedName("code_challenge") val codeChallenge: String,
    val state: String,
    @SerializedName("tenant_id") val tenantId: String,
    val scope: String = AppConfig.defaultOidcScope,
)

data class MobileAuthorizeResponse(
    @SerializedName("authorize_url") val authorizeUrl: String,
    @SerializedName("client_id") val clientId: String,
    @SerializedName("redirect_uri") val redirectUri: String,
    @SerializedName("tenant_id") val tenantId: String,
    val state: String,
)

data class MobileExchangeRequest(
    val code: String,
    @SerializedName("code_verifier") val codeVerifier: String,
    @SerializedName("redirect_uri") val redirectUri: String,
    @SerializedName("tenant_id") val tenantId: String,
)

data class MobileUserProfile(
    val id: String,
    @SerializedName("auth_subject_id") val authSubjectId: String?,
    @SerializedName("user_name") val userName: String,
    val email: String?,
    @SerializedName("tenant_id") val tenantId: String,
)

data class MobileTokenResponse(
    @SerializedName("access_token") val accessToken: String,
    @SerializedName("refresh_token") val refreshToken: String?,
    @SerializedName("token_type") val tokenType: String,
    @SerializedName("expires_in") val expiresIn: Int,
    @SerializedName("expires_at") val expiresAt: Long,
    val scope: String,
    @SerializedName("tenant_id") val tenantId: String,
    @SerializedName("oauth_client_id") val oauthClientId: String,
    val user: MobileUserProfile?,
)

data class ProductDto(
    @SerializedName("id") val id: String,
    @SerializedName("tenantId") val tenantId: String?,
    @SerializedName("name") val name: String,
    @SerializedName("description") val description: String,
    @SerializedName("price") val price: Double,
    @SerializedName("imageUrl") val imageUrl: String?,
    @SerializedName("category") val category: String,
    @SerializedName("stock") val stock: Int,
)

data class OrderItemDto(
    @SerializedName("id") val id: String,
    @SerializedName("orderId") val orderId: String?,
    @SerializedName("tenantId") val tenantId: String?,
    @SerializedName("productName") val productName: String,
    @SerializedName("price") val price: Double,
)

data class OrderDto(
    @SerializedName("id") val id: String,
    @SerializedName("tenantId") val tenantId: String?,
    @SerializedName("userId") val userId: String,
    @SerializedName("items") val items: List<OrderItemDto>,
    @SerializedName("totalPrice") val totalPrice: Double,
    @SerializedName("status") val status: String,
    @SerializedName("createdAt") val createdAt: String,
)

data class CreateOrderItemRequest(
    @SerializedName("productName") val productName: String,
    @SerializedName("price") val price: Double,
)

data class CreateOrderRequest(
    @SerializedName("items") val items: List<CreateOrderItemRequest>,
    @SerializedName("total") val total: Double,
)

data class PendingAuthState(
    val codeVerifier: String,
    val state: String,
    val tenantId: String,
)

data class SessionSnapshot(
    val accessToken: String,
    val refreshToken: String?,
    val tokenType: String,
    val expiresAt: Long,
    val scope: String,
    val tenantId: String,
    val oauthClientId: String,
    val userId: String?,
    val authSubjectId: String?,
    val userName: String?,
    val email: String?,
) {
    val isExpired: Boolean
        get() = expiresAt <= (System.currentTimeMillis() / 1000L)
}
