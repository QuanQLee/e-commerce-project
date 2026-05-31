import axios from 'axios'
import { runtimeEnv } from './config/env'
import { getToken, clearToken, getTenantId } from './auth'

const api = axios.create({
  withCredentials: true,
  baseURL: runtimeEnv.apiBaseUrl,
  timeout: 10_000,
  headers: {
    'Content-Type': 'application/json',
    ...(runtimeEnv.apiKey ? { apikey: runtimeEnv.apiKey } : {}),
  },
})

api.interceptors.request.use((config) => {
  const token = getToken()
  const tenantId = getTenantId() || runtimeEnv.tenantId
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  config.headers = config.headers || {}
  config.headers['X-Tenant-Id'] = tenantId
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status
    if (status === 401) {
      try {
        clearToken()
      } catch {}
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
