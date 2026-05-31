package com.ds.ecommerce.mobile.data

import com.ds.ecommerce.mobile.BuildConfig

object AppConfig {
    const val apiBaseUrl: String = BuildConfig.API_BASE_URL
    const val defaultTenantId: String = BuildConfig.DEFAULT_TENANT_ID
    const val defaultUsername: String = BuildConfig.DEFAULT_USERNAME
    const val defaultScope: String = "api1 offline_access"
    const val defaultOidcScope: String = BuildConfig.MOBILE_OIDC_SCOPE
    const val mobileRedirectUri: String = BuildConfig.MOBILE_REDIRECT_URI
    const val allowPasswordGrantFallback: Boolean = BuildConfig.ALLOW_PASSWORD_GRANT_FALLBACK

    init {
        if (!BuildConfig.DEBUG) {
            require(apiBaseUrl.startsWith("https://")) {
                "Release builds must point to an https mobile API base URL."
            }
            require(!apiBaseUrl.contains("example.com")) {
                "Release builds must replace the placeholder mobile API base URL."
            }
        }
    }
}
