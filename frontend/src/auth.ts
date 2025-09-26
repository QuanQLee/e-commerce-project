import { safeGetItem, safeRemoveItem, safeSetItem, type StorageArea } from './utils/storage'

const SESSION_KEY = 'admin_session'
const SESSION_PERSIST_KEY = 'admin_session_persist'

export type SessionPersistence = 'local' | 'session'

function toStorageArea(persist: SessionPersistence): StorageArea {
  return persist === 'session' ? 'session' : 'local'
}

export function setSessionAuthenticated(persist: SessionPersistence = 'local') {
  const area = toStorageArea(persist)
  safeSetItem(area, SESSION_KEY, '1', 'set session flag')
  safeSetItem('local', SESSION_PERSIST_KEY, persist, 'remember session persistence')
}

export function clearSession() {
  safeRemoveItem('local', SESSION_KEY, 'clear session flag')
  safeRemoveItem('session', SESSION_KEY, 'clear session flag')
  safeRemoveItem('local', SESSION_PERSIST_KEY, 'clear session persistence')
}

export function isSessionAuthenticated(): boolean {
  if (safeGetItem('session', SESSION_KEY, 'check session storage') === '1') return true
  return safeGetItem('local', SESSION_KEY, 'check local storage') === '1'
}

export function restorePersistedSession() {
  const persist = safeGetItem('local', SESSION_PERSIST_KEY, 'restore persisted session') as SessionPersistence | null
  if (persist !== 'local' && persist !== 'session') return
  const area = toStorageArea(persist)
  if (safeGetItem(area, SESSION_KEY, 'restore persisted session flag') === '1') return
  safeSetItem(area, SESSION_KEY, '1', 'restore persisted session flag')
}
