package com.ds.ecommerce.mobile.data

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class SessionStore(context: Context) {
    private val preferences: SharedPreferences by lazy {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        EncryptedSharedPreferences.create(
            context,
            "mobile_session_secure",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    suspend fun load(): SessionSnapshot? = withContext(Dispatchers.IO) {
        val accessToken = preferences.getString(Keys.accessToken, null) ?: return@withContext null
        SessionSnapshot(
            accessToken = accessToken,
            refreshToken = preferences.getString(Keys.refreshToken, null),
            tokenType = preferences.getString(Keys.tokenType, null) ?: "Bearer",
            expiresAt = preferences.getLong(Keys.expiresAt, 0L),
            scope = preferences.getString(Keys.scope, null) ?: AppConfig.defaultScope,
            tenantId = preferences.getString(Keys.tenantId, null) ?: AppConfig.defaultTenantId,
            oauthClientId = preferences.getString(Keys.oauthClientId, null) ?: "mobile-native",
            userId = preferences.getString(Keys.userId, null),
            authSubjectId = preferences.getString(Keys.authSubjectId, null),
            userName = preferences.getString(Keys.userName, null),
            email = preferences.getString(Keys.email, null),
        )
    }

    suspend fun save(response: MobileTokenResponse) = withContext(Dispatchers.IO) {
        val existing = load()
        preferences.edit().apply {
            putString(Keys.accessToken, response.accessToken)
            if (!response.refreshToken.isNullOrBlank()) {
                putString(Keys.refreshToken, response.refreshToken)
            } else if (!existing?.refreshToken.isNullOrBlank()) {
                putString(Keys.refreshToken, existing?.refreshToken)
            }
            putString(Keys.tokenType, response.tokenType)
            putLong(Keys.expiresAt, response.expiresAt)
            putString(Keys.scope, response.scope)
            putString(Keys.tenantId, response.tenantId)
            putString(Keys.oauthClientId, response.oauthClientId)

            val user = response.user
            val currentUserId = user?.id ?: existing?.userId
            val currentAuthSubjectId = user?.authSubjectId ?: existing?.authSubjectId
            val currentUserName = user?.userName ?: existing?.userName
            val currentEmail = user?.email ?: existing?.email

            if (currentUserId != null) {
                putString(Keys.userId, currentUserId)
            }
            if (currentAuthSubjectId != null) {
                putString(Keys.authSubjectId, currentAuthSubjectId)
            }
            if (currentUserName != null) {
                putString(Keys.userName, currentUserName)
            }
            if (currentEmail != null) {
                putString(Keys.email, currentEmail)
            }
        }.apply()
    }

    suspend fun savePendingAuth(state: PendingAuthState) = withContext(Dispatchers.IO) {
        preferences.edit().apply {
            putString(Keys.pendingCodeVerifier, state.codeVerifier)
            putString(Keys.pendingState, state.state)
            putString(Keys.pendingTenantId, state.tenantId)
        }.apply()
    }

    suspend fun loadPendingAuth(): PendingAuthState? = withContext(Dispatchers.IO) {
        val codeVerifier = preferences.getString(Keys.pendingCodeVerifier, null) ?: return@withContext null
        val state = preferences.getString(Keys.pendingState, null) ?: return@withContext null
        val tenantId = preferences.getString(Keys.pendingTenantId, null) ?: AppConfig.defaultTenantId
        PendingAuthState(
            codeVerifier = codeVerifier,
            state = state,
            tenantId = tenantId,
        )
    }

    suspend fun clearPendingAuth() = withContext(Dispatchers.IO) {
        preferences.edit().apply {
            remove(Keys.pendingCodeVerifier)
            remove(Keys.pendingState)
            remove(Keys.pendingTenantId)
        }.apply()
    }

    suspend fun clear() = withContext(Dispatchers.IO) {
        preferences.edit().clear().apply()
    }

    private object Keys {
        const val accessToken = "access_token"
        const val refreshToken = "refresh_token"
        const val tokenType = "token_type"
        const val expiresAt = "expires_at"
        const val scope = "scope"
        const val tenantId = "tenant_id"
        const val oauthClientId = "oauth_client_id"
        const val userId = "user_id"
        const val authSubjectId = "auth_subject_id"
        const val userName = "user_name"
        const val email = "email"
        const val pendingCodeVerifier = "pending_code_verifier"
        const val pendingState = "pending_state"
        const val pendingTenantId = "pending_tenant_id"
    }
}
