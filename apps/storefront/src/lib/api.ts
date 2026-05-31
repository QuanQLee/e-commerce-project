import axios from 'axios'
import { runtimeConfig } from '../config/runtime'

const api = axios.create({
  withCredentials: true,
  baseURL: runtimeConfig.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
    'X-Tenant-Id': runtimeConfig.tenantId,
    ...(runtimeConfig.apiKey ? { apikey: runtimeConfig.apiKey } : {}),
  },
})

if (typeof window !== 'undefined') {
  api.interceptors.request.use((config) => {
    try {
      const token = localStorage.getItem('access_token')
      if (token) {
        config.headers = config.headers || {}
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch (error) {
      if (runtimeConfig.nodeEnv !== 'production') {
        console.debug('[api] failed to read access token', error)
      }
    }
    config.headers = config.headers || {}
    config.headers['X-Tenant-Id'] = runtimeConfig.tenantId
    return config
  })
}

export default api
