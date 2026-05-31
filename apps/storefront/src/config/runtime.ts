const nodeEnv = process.env.NODE_ENV ?? 'development'
const isCI = String(process.env.CI || '').toLowerCase()
const strictRuntimeValidation =
  nodeEnv === 'production' && (isCI === '1' || isCI === 'true' || process.env.RUNTIME_ENV_STRICT === 'true')

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL || (nodeEnv === 'production' ? '' : 'http://localhost:9080')
const apiKey = process.env.NEXT_PUBLIC_API_KEY || ''
const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'public'

const missing: string[] = []
if (strictRuntimeValidation && !apiBaseUrl) {
  missing.push('NEXT_PUBLIC_API_BASE_URL')
}

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
}

const globalScope: Record<string, unknown> = typeof globalThis !== 'undefined' ? (globalThis as any) : {}

if (!apiBaseUrl) {
  const key = '__runtime_warn_missing_api_base__'
  if (!globalScope[key]) {
    console.warn(
      '[runtime-config] NEXT_PUBLIC_API_BASE_URL is not defined. Falling back to http://localhost:9080. '
        + 'Set the variable or export RUNTIME_ENV_STRICT=true to enforce validation.'
    )
    globalScope[key] = true
  }
}

if (nodeEnv === 'production' && apiBaseUrl.startsWith('http://')) {
  const key = '__runtime_warn_insecure_api_base__'
  if (!globalScope[key]) {
    console.warn(
      '[runtime-config] NEXT_PUBLIC_API_BASE_URL is using an http:// URL in production. Consider switching to HTTPS.'
    )
    globalScope[key] = true
  }
}

export const runtimeConfig = Object.freeze({
  nodeEnv,
  apiBaseUrl: apiBaseUrl || 'http://localhost:9080',
  apiKey,
  tenantId,
})

export type RuntimeConfig = typeof runtimeConfig
