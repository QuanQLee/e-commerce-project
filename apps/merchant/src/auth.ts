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
  } catch {}
  try {
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('expires_at')
  } catch {}
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

