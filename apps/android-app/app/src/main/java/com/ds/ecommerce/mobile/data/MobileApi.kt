package com.ds.ecommerce.mobile.data

import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.ResponseBody
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface AuthApi {
    @POST("auth/mobile/login")
    suspend fun login(@Body request: MobileLoginRequest): MobileTokenResponse

    @POST("auth/mobile/refresh")
    suspend fun refresh(@Body request: MobileRefreshRequest): MobileTokenResponse

    @POST("auth/mobile/authorize")
    suspend fun authorize(@Body request: MobileAuthorizeRequest): MobileAuthorizeResponse

    @POST("auth/mobile/exchange")
    suspend fun exchange(@Body request: MobileExchangeRequest): MobileTokenResponse
}

interface CommerceApi {
    @GET("api/v1/catalog/products")
    suspend fun getProducts(): List<ProductDto>

    @GET("api/v1/order/orders")
    suspend fun getOrders(): List<OrderDto>

    @POST("api/v1/order/orders")
    suspend fun createOrder(@Body request: CreateOrderRequest): ResponseBody
}

object MobileApiFactory {
    fun createAuthApi(): AuthApi =
        Retrofit.Builder()
            .baseUrl(AppConfig.apiBaseUrl.ensureTrailingSlash())
            .addConverterFactory(GsonConverterFactory.create())
            .client(baseClient())
            .build()
            .create(AuthApi::class.java)

    fun createCommerceApi(sessionStore: SessionStore): CommerceApi =
        Retrofit.Builder()
            .baseUrl(AppConfig.apiBaseUrl.ensureTrailingSlash())
            .addConverterFactory(GsonConverterFactory.create())
            .client(authenticatedClient(sessionStore))
            .build()
            .create(CommerceApi::class.java)

    private fun baseClient(): OkHttpClient =
        OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor())
            .build()

    private fun authenticatedClient(sessionStore: SessionStore): OkHttpClient =
        OkHttpClient.Builder()
            .addInterceptor(Interceptor { chain ->
                val session = runBlocking { sessionStore.load() }
                val request = chain.request().newBuilder()
                    .header("Accept", "application/json")
                    .header("X-Tenant-Id", session?.tenantId ?: AppConfig.defaultTenantId)
                    .apply {
                        session?.accessToken?.takeIf { it.isNotBlank() }?.let { token ->
                            header("Authorization", "Bearer $token")
                        }
                    }
                    .build()
                chain.proceed(request)
            })
            .addInterceptor(loggingInterceptor())
            .build()

    private fun loggingInterceptor(): HttpLoggingInterceptor =
        HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }

    private fun String.ensureTrailingSlash(): String = if (endsWith("/")) this else "$this/"
}
