const STORAGE_PREFIX = '[storage]'

export type StorageArea = 'local' | 'session'

function resolveStorage(area: StorageArea): Storage | null {
  if (typeof window === 'undefined') return null
  return area === 'local' ? window.localStorage : window.sessionStorage
}

function logStorageError(action: string, key: string, area: StorageArea, context: string | undefined, error: unknown) {
  const suffix = context ? ` (${context})` : ''
  console.warn(`${STORAGE_PREFIX} failed to ${action} ${area}Storage key "${key}"${suffix}`, error)
}

export function safeSetItem(area: StorageArea, key: string, value: string, context?: string): boolean {
  const storage = resolveStorage(area)
  if (!storage) return false
  try {
    storage.setItem(key, value)
    return true
  } catch (error) {
    logStorageError('set', key, area, context, error)
    return false
  }
}

export function safeGetItem(area: StorageArea, key: string, context?: string): string | null {
  const storage = resolveStorage(area)
  if (!storage) return null
  try {
    return storage.getItem(key)
  } catch (error) {
    logStorageError('get', key, area, context, error)
    return null
  }
}

export function safeRemoveItem(area: StorageArea, key: string, context?: string): boolean {
  const storage = resolveStorage(area)
  if (!storage) return false
  try {
    storage.removeItem(key)
    return true
  } catch (error) {
    logStorageError('remove', key, area, context, error)
    return false
  }
}
