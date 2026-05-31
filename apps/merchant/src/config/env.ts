const env = import.meta.env as Record<string, string | boolean | undefined>
const mode = (env.MODE as string) || (env.PROD ? 'production' : 'development')
const strict = env.VITE_RUNTIME_ENV_STRICT === 'true'

const rawApiBase = (env.VITE_API_BASE_URL as string | undefined)?.trim() || ''
const apiKey = (env.VITE_API_KEY as string | undefined)?.trim() || ''
const ssoEnabled = (env.VITE_SSO_ENABLED as string | undefined)?.trim()
const passwordLoginEnabled = (env.VITE_PASSWORD_LOGIN_ENABLED as string | undefined)?.trim()
const selfRegistrationEnabled = (env.VITE_SELF_REGISTRATION_ENABLED as string | undefined)?.trim()
const tenantId = (env.VITE_TENANT_ID as string | undefined)?.trim() || 'public'

if (strict && !rawApiBase) {
  throw new Error('VITE_API_BASE_URL must be set when VITE_RUNTIME_ENV_STRICT=true')
}

if (!rawApiBase) {
  console.warn(
    '[env] VITE_API_BASE_URL is not defined. Falling back to http://localhost:8000. '
      + 'Set VITE_RUNTIME_ENV_STRICT=true to enforce validation in production.'
  )
}

if (mode === 'production' && rawApiBase.startsWith('http://')) {
  console.warn('[env] VITE_API_BASE_URL is using http:// in production. Consider enabling HTTPS.')
}

if (
  (passwordLoginEnabled === '1' || passwordLoginEnabled === 'true') &&
  mode === 'production'
) {
  console.warn('[env] Password login is enabled in production. Prefer SSO-only merchant access.')
}

export const runtimeEnv = Object.freeze({
  mode,
  apiBaseUrl: rawApiBase || 'http://localhost:8000',
  apiKey,
  ssoEnabled: ssoEnabled === '1' || ssoEnabled === 'true',
  passwordLoginEnabled: passwordLoginEnabled === '1' || passwordLoginEnabled === 'true',
  selfRegistrationEnabled: selfRegistrationEnabled === '1' || selfRegistrationEnabled === 'true',
  tenantId,
})

export type RuntimeEnv = typeof runtimeEnv
