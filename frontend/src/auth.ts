const SESSION_KEY = 'admin_session'
const SESSION_PERSIST_KEY = 'admin_session_persist'

export type SessionPersistence = 'local' | 'session'

function getStorage(persist: SessionPersistence): Storage {
  return persist === 'local' ? window.localStorage : window.sessionStorage
}

export function setSessionAuthenticated(persist: SessionPersistence = 'local') {
  try {
    const storage = getStorage(persist)
    storage.setItem(SESSION_KEY, '1')
    window.localStorage.setItem(SESSION_PERSIST_KEY, persist)
  } catch (error) {
    console.warn('[auth] failed to persist session flag', error)
  }
}

export function clearSession() {
  try {
    window.localStorage.removeItem(SESSION_KEY)
  } catch {}
  try {
    window.sessionStorage.removeItem(SESSION_KEY)
  } catch {}
  try {
    window.localStorage.removeItem(SESSION_PERSIST_KEY)
  } catch {}
}

export function isSessionAuthenticated(): boolean {
  try {
    if (window.sessionStorage.getItem(SESSION_KEY) === '1') return true
  } catch {}
  try {
    if (window.localStorage.getItem(SESSION_KEY) === '1') return true
  } catch {}
  return false
}

export function restorePersistedSession() {
  try {
    const persist = window.localStorage.getItem(SESSION_PERSIST_KEY) as SessionPersistence | null
    if (!persist) return
    const storage = getStorage(persist)
    if (storage.getItem(SESSION_KEY) === '1') return
    storage.setItem(SESSION_KEY, '1')
  } catch (error) {
    console.warn('[auth] failed to restore persisted session', error)
  }
}
