import { useState } from 'react'
import { Container, TextField, Button, Typography, Stack } from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../api/api'
import { useSnackbar } from '../providers/SnackbarProvider'
import { clearSession, setSessionAuthenticated } from '../auth'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { success, error } = useSnackbar()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: string } }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('username', username)
      params.append('password', password)
      const response = await api.post('/auth/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })

      const token = response?.data?.access_token
      const expiresIn = response?.data?.expires_in
      if (token) {
        try {
          window.localStorage.setItem('access_token', token)
          if (typeof expiresIn === 'number') {
            const expiresAt = Date.now() + expiresIn * 1000
            window.localStorage.setItem('access_token_expires_at', String(expiresAt))
          }
        } catch (storageError) {
          console.warn('[auth] failed to persist access token', storageError)
        }
      }

      setSessionAuthenticated('local')
      success('Logged in')
      const redirectTo = location.state?.from || '/'
      navigate(redirectTo, { replace: true })
    } catch (err) {
      console.error(err)
      error('Failed to login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (err) {
      console.warn('[auth] logout failed', err)
    } finally {
      clearSession()
      try {
        window.localStorage.removeItem('access_token')
        window.localStorage.removeItem('access_token_expires_at')
      } catch {}
      success('Logged out')
    }
  }

  return (
    <Container maxWidth="sm">
      <Typography variant="h4" gutterBottom>
        Login
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Username"
          fullWidth
          margin="normal"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
        <TextField
          label="Password"
          type="password"
          fullWidth
          margin="normal"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
          <Button variant="contained" type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </Button>
          <Button variant="outlined" type="button" onClick={handleLogout}>
            Logout
          </Button>
          {import.meta.env.VITE_SSO_ENABLED === '1' && (
            <Button
              variant="text"
              onClick={() => {
                const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9080'
                const redirect = encodeURIComponent(window.location.origin + '/')
                window.location.href = `${base}/auth/oidc/login?redirect=${redirect}`
              }}
            >
              Login with SSO
            </Button>
          )}
        </Stack>
      </form>
    </Container>
  )
}
