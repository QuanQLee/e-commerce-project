const env = import.meta.env as Record<string, string | boolean | undefined>
const mode = (env.MODE as string) || (env.PROD ? 'production' : 'development')
const strict = env.VITE_RUNTIME_ENV_STRICT === 'true'

const rawApiBase = (env.VITE_API_BASE_URL as string | undefined)?.trim() || ''
const apiKey = (env.VITE_API_KEY as string | undefined)?.trim() || ''
const ssoEnabled = (env.VITE_SSO_ENABLED as string | undefined)?.trim()

if (strict && !rawApiBase) {
  throw new Error('VITE_API_BASE_URL must be set when VITE_RUNTIME_ENV_STRICT=true')
}

if (!rawApiBase) {
  console.warn(
    '[env] VITE_API_BASE_URL is not defined. Falling back to http://localhost:9080. '
      + 'Set VITE_RUNTIME_ENV_STRICT=true to enforce validation in production.'
  )
}

if (mode === 'production' && rawApiBase.startsWith('http://')) {
  console.warn('[env] VITE_API_BASE_URL is using http:// in production. Consider enabling HTTPS.')
}

export const runtimeEnv = Object.freeze({
  mode,
  apiBaseUrl: rawApiBase || 'http://localhost:9080',
  apiKey,
  ssoEnabled: ssoEnabled === '1' || ssoEnabled === 'true',
})

export type RuntimeEnv = typeof runtimeEnv
