import { runtimeEnv } from './config/env'

let inMemoryToken: string | null = null
let inMemoryExpiry = 0

export function setToken(token: string, expiresAtMs: number, persist: 'none' | 'session' | 'local' = 'local') {
  inMemoryToken = token
  inMemoryExpiry = expiresAtMs
  try {
    if (persist === 'local') {
      localStorage.setItem('access_token', token)
      localStorage.setItem('expires_at', String(expiresAtMs))
    } else if (persist === 'session') {
      sessionStorage.setItem('access_token', token)
      sessionStorage.setItem('expires_at', String(expiresAtMs))
    }
  } catch {}
}

export function clearToken() {
  inMemoryToken = null
  inMemoryExpiry = 0
  try {
    localStorage.removeItem('access_token')
    localStorage.removeItem('expires_at')
    localStorage.removeItem('token_type')
    localStorage.removeItem('merchant_tenant_id')
  } catch {}
  try {
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('expires_at')
    sessionStorage.removeItem('merchant_tenant_id')
  } catch {}
}

export function setTenantId(tenantId: string, persist: 'session' | 'local' = 'local') {
  try {
    if (persist === 'local') {
      localStorage.setItem('merchant_tenant_id', tenantId)
      sessionStorage.removeItem('merchant_tenant_id')
    } else {
      sessionStorage.setItem('merchant_tenant_id', tenantId)
      localStorage.removeItem('merchant_tenant_id')
    }
  } catch {}
}

export function getTenantId(): string | null {
  try {
    const sessionValue = sessionStorage.getItem('merchant_tenant_id')
    if (sessionValue) return sessionValue
  } catch {}
  try {
    const localValue = localStorage.getItem('merchant_tenant_id')
    if (localValue) return localValue
  } catch {}
  return null
}

export function getToken(): string | null {
  // Prefer in-memory if valid
  if (inMemoryToken && (!inMemoryExpiry || Date.now() < inMemoryExpiry)) return inMemoryToken
  // Fallback order: sessionStorage -> localStorage
  try {
    const sToken = sessionStorage.getItem('access_token')
    const sExp = Number(sessionStorage.getItem('expires_at') || 0)
    if (sToken && (!sExp || Date.now() < sExp)) {
      inMemoryToken = sToken
      inMemoryExpiry = sExp
      return sToken
    }
  } catch {}
  try {
    const lToken = localStorage.getItem('access_token')
    const lExp = Number(localStorage.getItem('expires_at') || 0)
    if (lToken && (!lExp || Date.now() < lExp)) {
      inMemoryToken = lToken
      inMemoryExpiry = lExp
      return lToken
    }
  } catch {}
  return null
}

export function isAuthed(): boolean {
  const token = getToken()
  if (!token) return false
  // getToken already validates expiry
  return true
}

export type SessionSnapshot = {
  authenticated: boolean
  tenant_id?: string
  scope?: string
  expires_at?: number
}

export async function getSessionSnapshot(): Promise<SessionSnapshot | null> {
  const tenantId = getTenantId() || runtimeEnv.tenantId
  const response = await fetch(`${runtimeEnv.apiBaseUrl}/auth/me`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(runtimeEnv.apiKey ? { apikey: runtimeEnv.apiKey } : {}),
      ...(tenantId ? { 'X-Tenant-Id': tenantId } : {}),
    },
  })

  if (response.status === 401) {
    return null
  }
  if (!response.ok) {
    throw new Error(`Failed to load session (${response.status})`)
  }
  const payload = (await response.json()) as SessionSnapshot
  if (payload?.tenant_id) {
    setTenantId(payload.tenant_id, 'local')
  }
  return payload
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
  if (typeof atob === 'function') {
    return atob(padded)
  }
  return ''
}

export function getTokenClaims(): Record<string, unknown> | null {
  const token = getToken()
  if (!token) return null
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const payload = JSON.parse(decodeBase64Url(parts[1])) as Record<string, unknown>
    return payload
  } catch {
    return null
  }
}

function extractPermissions(claims: Record<string, unknown> | null): string[] {
  if (!claims) return []

  const permissions = claims.permissions
  if (Array.isArray(permissions)) {
    return permissions.filter((item): item is string => typeof item === 'string')
  }

  const scope = claims.scope ?? claims.scopes
  if (typeof scope === 'string') {
    return scope.split(' ').map((item) => item.trim()).filter(Boolean)
  }

  return []
}

export function hasPermission(permission: string): boolean {
  const claims = getTokenClaims()
  const perms = extractPermissions(claims)
  // Backward compatibility: older tokens may not carry permission claims.
  if (perms.length === 0) return true
  if (perms.includes('*') || perms.includes('admin.*')) return true
  return perms.includes(permission)
}
