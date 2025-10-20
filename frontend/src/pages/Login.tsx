import { useState } from 'react'
import { Container, TextField, Button, Typography, Stack, Link } from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../api/api'
import { useSnackbar } from '../providers/SnackbarProvider'
import { clearSession, setSessionAuthenticated } from '../auth'
import { safeRemoveItem } from '../utils/storage'
import { runtimeEnv } from '../config/env'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const { success, error } = useSnackbar()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { from?: string } | undefined

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      setLoading(true)
      if (mode === 'register') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match')
        }
        await api.post('/auth/register', { username, password })
        success('Account created. You can now log in.')
        setMode('login')
        setPassword('')
        setConfirmPassword('')
        return
      }

      const params = new URLSearchParams()
      params.append('username', username)
      params.append('password', password)
      await api.post('/auth/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })

      try {
        setSessionAuthenticated('local')
      } catch (storageError) {
        console.warn('[auth] failed to persist access token', storageError)
      }

      success('Logged in')
      const redirectTo = state?.from || '/'
      navigate(redirectTo, { replace: true })
    } catch (err) {
      console.error(err)
      if (err instanceof Error && err.message) {
        error(err.message)
      } else {
        error(mode === 'register' ? 'Failed to create account' : 'Failed to login')
      }
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
      safeRemoveItem('local', 'access_token', 'logout cleanup')
      safeRemoveItem('local', 'access_token_expires_at', 'logout cleanup')
      success('Logged out')
    }
  }

  return (
    <Container maxWidth="sm">
      <Typography variant="h4" gutterBottom>
        {mode === 'register' ? 'Create account' : 'Login'}
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
        {mode === 'register' && (
          <TextField
            label="Confirm password"
            type="password"
            fullWidth
            margin="normal"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        )}
        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
          <Button variant="contained" type="submit" disabled={loading}>
            {loading ? (mode === 'register' ? 'Creating...' : 'Logging in...') : mode === 'register' ? 'Create account' : 'Login'}
          </Button>
          {mode === 'login' && (
            <Button variant="outlined" type="button" onClick={handleLogout}>
              Logout
            </Button>
          )}
          {runtimeEnv.ssoEnabled && (
            <Button
              variant="text"
              onClick={() => {
                const redirect = encodeURIComponent(window.location.origin + (state?.from || '/'))
                window.location.href = `${runtimeEnv.apiBaseUrl}/auth/oidc/login?redirect=${redirect}`
              }}
            >
              Login with SSO
            </Button>
          )}
        </Stack>
        <Typography variant="body2" sx={{ mt: 2 }}>
          {mode === 'register' ? (
            <>
              Already have an account?{' '}
              <Link
                component="button"
                type="button"
                onClick={() => {
                  setMode('login')
                  setConfirmPassword('')
                }}
              >
                Back to login
              </Link>
            </>
          ) : (
            <>
              Need an account?{' '}
              <Link
                component="button"
                type="button"
                onClick={() => {
                  setMode('register')
                  setConfirmPassword('')
                }}
              >
                Create one
              </Link>
            </>
          )}
        </Typography>
      </form>
    </Container>
  )
}
