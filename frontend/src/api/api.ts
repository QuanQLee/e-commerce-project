import axios from 'axios'
import { runtimeEnv } from '../config/env'
import { safeRemoveItem } from '../utils/storage'

let onApiError: ((message: string) => void) | null = null
export function setApiErrorHandler(fn: (message: string) => void) {
  onApiError = fn
}

const api = axios.create({
  withCredentials: true,
  baseURL: runtimeEnv.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
    ...(runtimeEnv.apiKey ? { apikey: runtimeEnv.apiKey } : {}),
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status
    const message = error?.response?.data?.message || error?.message || 'Request failed'
    if (status === 401 && typeof window !== 'undefined') {
      safeRemoveItem('local', 'access_token', 'api 401 cleanup')
      safeRemoveItem('local', 'access_token_expires_at', 'api 401 cleanup')
      safeRemoveItem('local', 'admin_session', 'api 401 cleanup')
      safeRemoveItem('local', 'admin_session_persist', 'api 401 cleanup')
      safeRemoveItem('session', 'admin_session', 'api 401 cleanup')
      if (onApiError) onApiError('Authentication required. Please sign in again.')
      window.location.href = '/login'
      return Promise.reject(error)
    }
    if (onApiError) onApiError(message)
    return Promise.reject(error)
  }
)

export default api
