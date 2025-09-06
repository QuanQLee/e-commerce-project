import axios from 'axios'

// For client-side requests, Next.js exposes env that start with NEXT_PUBLIC_
const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:9080'
const apiKey = process.env.NEXT_PUBLIC_API_KEY || ''

const api = axios.create({ withCredentials: true, 
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    ...(apiKey ? { apikey: apiKey } : {}),
  },
})

// Attach token from localStorage (only available in browser)
if (typeof window !== 'undefined') {
  api.interceptors.request.use((config) => {
    try {
      const token = localStorage.getItem('access_token')
      if (token) {
        config.headers = config.headers || {}
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch {}
    return config
  })
}

export default api



