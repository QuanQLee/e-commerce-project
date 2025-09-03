import axios from 'axios'

// Base URL points to the Kong gateway. Defaults to localhost for dev.
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
// Pass through API key for Kong ACL/JWT flows (frontend consumer). Provide a sane default for dev.
const apiKey = (import.meta.env as any).VITE_API_KEY || 'mytestkey123'

const api = axios.create({
  baseURL,
  timeout: 10_000,
  headers: {
    'Content-Type': 'application/json',
    apikey: apiKey,
  },
})

// Attach JWT from localStorage if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status
    if (status === 401) {
      try {
        localStorage.removeItem('access_token')
        localStorage.removeItem('expires_at')
        localStorage.removeItem('token_type')
      } catch {}
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
