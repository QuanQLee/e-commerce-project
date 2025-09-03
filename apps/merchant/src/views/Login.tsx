import { useMemo, useState } from 'react'
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
import api from '../api'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation() as any
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Configurable via env; fall back to sample values from Auth Minimum.md
  const { clientId, clientSecret, scope } = useMemo(() => ({
    clientId: (import.meta.env as any).VITE_AUTH_CLIENT_ID || '1',
    clientSecret: (import.meta.env as any).VITE_AUTH_CLIENT_SECRET || 'secret1',
    scope: (import.meta.env as any).VITE_AUTH_SCOPE || 'api1',
  }), [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const form = new URLSearchParams()
      form.set('client_id', clientId)
      form.set('client_secret', clientSecret)
      form.set('grant_type', 'password')
      form.set('username', username)
      form.set('password', password)
      form.set('scope', scope)

      const res = await api.post('/api/v1/auth/connect/token', form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
      const accessToken = res.data?.access_token
      const expiresIn = Number(res.data?.expires_in || 3600)
      const tokenType = res.data?.token_type || 'Bearer'

      if (!accessToken) throw new Error('登录失败：未返回令牌')

      const expiresAt = Date.now() + expiresIn * 1000
      localStorage.setItem('access_token', accessToken)
      localStorage.setItem('token_type', tokenType)
      localStorage.setItem('expires_at', String(expiresAt))
      if (!remember) {
        // For non-remember, store a session flag to clear on unload
        sessionStorage.setItem('session_login', '1')
      }
      const redirectTo = location.state?.from || '/'
      navigate(redirectTo, { replace: true })
    } catch (err: any) {
      const msg = err?.response?.data?.error_description || err?.response?.data?.message || err?.message || '登录失败'
      setError(msg)
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
              <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>Merchant Portal</Typography>
              <Typography color="text.secondary" sx={{ maxWidth: 460 }}>
                登录管理后台，创建商品、查看订单、发放优惠券并监控业务表现。
              </Typography>
            </Box>
          </Box>

          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <Card elevation={0} sx={{ flex: 1, borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 12px 40px rgba(0,0,0,0.08)', backdropFilter: 'saturate(180%) blur(8px)', bgcolor: 'rgba(255,255,255,0.75)' }}>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>欢迎回来</Typography>
                <Box component="form" onSubmit={onSubmit} noValidate>
                  <Stack spacing={2}>
                    <TextField
                      label="用户名或邮箱"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoFocus
                      fullWidth
                    />
                    <TextField
                      label="密码"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type={showPassword ? 'text' : 'password'}
                      required
                      fullWidth
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton aria-label="toggle password visibility" onClick={() => setShowPassword(v => !v)} edge="end">
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                    />
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <FormControlLabel control={<Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} />} label="记住我" />
                      <Link component={RouterLink} to="#" underline="hover">忘记密码？</Link>
                    </Stack>

                    {error && (
                      <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'rgba(255,0,0,0.06)', border: '1px solid rgba(255,0,0,0.15)' }}>
                        <Typography color="error" variant="body2">{error}</Typography>
                      </Box>
                    )}

                    <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ py: 1.2 }}>
                      {loading ? '正在登录…' : '登录'}
                    </Button>

                    <Typography variant="caption" color="text.secondary">
                      登录即表示你同意我们的服务协议与隐私政策。
                    </Typography>
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

