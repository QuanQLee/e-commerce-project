import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  headers: {
    'Content-Type': 'application/json',
    apikey: import.meta.env.VITE_API_KEY ?? '',
  },
})

export default api
