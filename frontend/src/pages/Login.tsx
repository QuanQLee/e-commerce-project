import { useState } from 'react'
import { Container, TextField, Button, Typography, Stack } from '@mui/material'
import api from '../api/api'
import { useSnackbar } from '../providers/SnackbarProvider'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { success, error } = useSnackbar()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('username', username)
      params.append('password', password)
      await api.post('/auth/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
      success('Logged in')
      navigate('/')
    } catch (err) {
      console.error(err)
      error('Failed to login')
    }
    finally { setLoading(false) }
  }

  return (
    <Container>
      <Typography variant="h4" gutterBottom>Login</Typography>
      <form onSubmit={handleSubmit}>
        <TextField label="Username" fullWidth margin="normal" value={username} onChange={e => setUsername(e.target.value)} />
        <TextField label="Password" type="password" fullWidth margin="normal" value={password} onChange={e => setPassword(e.target.value)} />
        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
          <Button variant="contained" type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</Button>
          <Button variant="outlined" onClick={() => api.post('/auth/logout')}>Logout</Button>
          {import.meta.env.VITE_SSO_ENABLED === '1' && (
            <Button variant="text" onClick={() => {
              const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9080'
              const redirect = encodeURIComponent(window.location.origin + '/')
              window.location.href = `${base}/auth/oidc/login?redirect=${redirect}`
            }}>Login with SSO</Button>
          )}
        </Stack>
      </form>
    </Container>
  )
}
