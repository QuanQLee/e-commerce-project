import axios from 'axios'

let onApiError: ((message: string) => void) | null = null
export function setApiErrorHandler(fn: (message: string) => void) {
  onApiError = fn
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
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

// Basic error surface
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const msg = error?.response?.data?.message || error?.message || 'Request failed'
    if (onApiError) onApiError(msg)
    return Promise.reject(error)
  }
)

export default api
