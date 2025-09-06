import axios from 'axios'

let onApiError: ((message: string) => void) | null = null
export function setApiErrorHandler(fn: (message: string) => void) {
  onApiError = fn
}

const api = axios.create({
  withCredentials: true,
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:9080',
  headers: {
    'Content-Type': 'application/json',
    apikey: import.meta.env.VITE_API_KEY ?? '',
  },
})

// Attach token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Basic error surface + redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status
    const msg = error?.response?.data?.message || error?.message || 'Request failed'
    if (status === 401 && typeof window !== 'undefined') {
      try { localStorage.removeItem('access_token') } catch {}
      if (onApiError) onApiError('闇€瑕佺櫥褰曪紝璇峰厛鐧诲綍')
      window.location.href = '/login'
      return Promise.reject(error)
    }
    if (onApiError) onApiError(msg)
    return Promise.reject(error)
  }
)

export default api
