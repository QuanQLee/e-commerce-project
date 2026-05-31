import { useState } from 'react'
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Container,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import type { AxiosError } from 'axios'
import api from '../api'
import { getTenantId, setTenantId } from '../auth'
import { useI18n } from '../state/i18n'
import { runtimeEnv } from '../config/env'

type LocationState = {
  from?: string
}

type LoginErrorResponse = {
  message?: string
  detail?: string | Array<{ msg?: string; loc?: Array<string | number> }>
}

type LoginProps = {
  onLoginSuccess?: () => void
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const redirectState = (location.state as LocationState | null) || undefined
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const { t } = useI18n()
  const passwordLoginEnabled = runtimeEnv.passwordLoginEnabled
  const selfRegistrationEnabled = runtimeEnv.selfRegistrationEnabled && passwordLoginEnabled

  const resolveApiErrorMessage = (err: AxiosError<LoginErrorResponse>) => {
    const data = err.response?.data
    if (typeof data?.message === 'string' && data.message.trim()) {
      return data.message
    }
    if (typeof data?.detail === 'string' && data.detail.trim()) {
      return data.detail
    }
    if (Array.isArray(data?.detail)) {
      const missingCredential = data.detail.some((item) => {
        const location = Array.isArray(item.loc) ? item.loc.join('.') : ''
        return (
          item.msg === 'Field required' &&
          (location.endsWith('username') || location.endsWith('password'))
        )
      })
      if (missingCredential) {
        return t('login.missingCredentials')
      }
      const firstMessage = data.detail.find((item) => typeof item.msg === 'string' && item.msg.trim())?.msg
      if (firstMessage) {
        return firstMessage
      }
    }
    return err.message || t('login.error')
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)
    if (!passwordLoginEnabled) {
      setError('Password login is disabled.')
      return
    }
    const normalizedUsername = username.trim()
    if (!normalizedUsername || !password.trim()) {
      setError(t('login.missingCredentials'))
      return
    }
    if (mode === 'register' && !selfRegistrationEnabled) {
      setError('Self-service registration is disabled.')
      return
    }
    if (mode === 'register' && !confirmPassword.trim()) {
      setError(t('login.confirmPasswordRequired'))
      return
    }
    setLoading(true)
    try {
      if (mode === 'register') {
        if (password !== confirmPassword) {
          throw new Error(t('login.passwordMismatch'))
        }
        await api.post('/auth/register', { username: normalizedUsername, password })
        setSuccessMessage(t('login.registerSuccess'))
        setMode('login')
        setUsername(normalizedUsername)
        setPassword('')
        setConfirmPassword('')
        return
      }

      const form = new URLSearchParams()
      form.set('username', normalizedUsername)
      form.set('password', password)
      const loginResp = await api.post('/auth/login', form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      const tenantId = loginResp?.data?.tenant_id
      if (typeof tenantId === 'string' && tenantId.trim()) {
        setTenantId(tenantId.trim(), remember ? 'local' : 'session')
      }
      onLoginSuccess?.()
      const redirectTo = redirectState?.from || '/'
      navigate(redirectTo, { replace: true })
    } catch (err: unknown) {
      const apiError = err as AxiosError<LoginErrorResponse>
      const message = resolveApiErrorMessage(apiError)
      setError(typeof message === 'string' ? message : t('login.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #e8f0ff 0%, #fff 100%)' }}>
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="stretch">
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>
                {t('login.heroTitle')}
              </Typography>
              <Typography color="text.secondary" sx={{ maxWidth: 460 }}>
                {t('login.heroSubtitle')}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <Card
              elevation={0}
              sx={{
                flex: 1,
                borderRadius: 3,
                border: '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.08)',
                backdropFilter: 'saturate(180%) blur(8px)',
                bgcolor: 'rgba(255,255,255,0.75)',
              }}
            >
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                {t('login.welcome')}
              </Typography>
              <Box component="form" onSubmit={onSubmit} noValidate>
                <Stack spacing={2}>
                  {passwordLoginEnabled ? (
                    <>
                      <TextField
                        label={t('login.usernameLabel')}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        autoFocus
                        fullWidth
                      />
                      <TextField
                        label={t('login.passwordLabel')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type={showPassword ? 'text' : 'password'}
                        required
                        fullWidth
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                aria-label="toggle password visibility"
                                onClick={() => setShowPassword((v) => !v)}
                                edge="end"
                              >
                                {showPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                      {mode === 'register' && (
                        <TextField
                          label={t('login.confirmPasswordLabel')}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          type={showPassword ? 'text' : 'password'}
                          required
                          fullWidth
                        />
                      )}
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <FormControlLabel
                          control={<Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} />}
                          label={t('login.rememberMe')}
                        />
                        <Link component={RouterLink} to="#" underline="hover">
                          {t('login.forgotPassword')}
                        </Link>
                      </Stack>
                    </>
                  ) : null}

                  {error && (
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        bgcolor: 'rgba(255,0,0,0.06)',
                        border: '1px solid rgba(255,0,0,0.15)',
                      }}
                    >
                      <Typography color="error" variant="body2">
                        {error}
                      </Typography>
                    </Box>
                  )}

                  {!passwordLoginEnabled && !runtimeEnv.ssoEnabled && (
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        bgcolor: 'rgba(255,165,0,0.08)',
                        border: '1px solid rgba(255,165,0,0.2)',
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        No interactive merchant sign-in method is enabled.
                      </Typography>
                    </Box>
                  )}

                  {passwordLoginEnabled && (
                    <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ py: 1.2 }}>
                      {loading
                        ? t(mode === 'register' ? 'login.creating' : 'login.submitting')
                        : t(mode === 'register' ? 'login.createAccount' : 'login.submit')}
                    </Button>
                  )}

                    {runtimeEnv.ssoEnabled && (
                      <Button
                        variant="text"
                        onClick={() => {
                          const redirect = window.location.origin + (redirectState?.from || '/')
                          const params = new URLSearchParams({ redirect })
                          const tenantId = getTenantId() || runtimeEnv.tenantId
                          if (tenantId) {
                            params.set('tenant_id', tenantId)
                          }
                          window.location.href = `${runtimeEnv.apiBaseUrl}/auth/oidc/login?${params.toString()}`
                        }}
                      >
                        {t('login.sso')}
                      </Button>
                    )}
                    {successMessage && (
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: 1.5,
                          bgcolor: 'rgba(0,128,0,0.08)',
                          border: '1px solid rgba(0,128,0,0.2)',
                        }}
                      >
                        <Typography color="success.main" variant="body2">
                          {successMessage}
                        </Typography>
                      </Box>
                    )}

                    <Typography variant="caption" color="text.secondary">
                      {t('login.disclaimer')}
                    </Typography>
                    {selfRegistrationEnabled && (
                      <Typography variant="body2" color="text.secondary">
                        {mode === 'login' ? (
                          <>
                            {t('login.noAccountPrompt')}{' '}
                            <Link
                              component="button"
                              type="button"
                              onClick={() => {
                                setMode('register')
                                setConfirmPassword('')
                              }}
                            >
                              {t('login.switchToRegister')}
                            </Link>
                          </>
                        ) : (
                          <>
                            {t('login.haveAccountPrompt')}{' '}
                            <Link
                              component="button"
                              type="button"
                              onClick={() => {
                                setMode('login')
                                setConfirmPassword('')
                              }}
                            >
                              {t('login.switchToLogin')}
                            </Link>
                          </>
                        )}
                      </Typography>
                    )}
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Stack>
      </Container>
    </Box>
  )
}

