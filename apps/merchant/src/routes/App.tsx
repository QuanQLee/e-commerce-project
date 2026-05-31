import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import { AppBar, Toolbar, Typography, Container, Button, Stack, Box, CircularProgress } from '@mui/material'
import { Suspense, lazy, type ReactNode, useCallback, useEffect, useState } from 'react'
import Login from '../views/Login'
import api from '../api'
import { clearToken, getSessionSnapshot, hasPermission } from '../auth'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { useI18n } from '../state/i18n'

const Dashboard = lazy(() => import('../views/Dashboard'))
const Products = lazy(() => import('../views/Products'))
const Orders = lazy(() => import('../views/Orders'))
const Coupons = lazy(() => import('../views/Coupons'))
const Rbac = lazy(() => import('../views/Rbac'))

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated'

function LoadingScreen({ message }: { message: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 8 }}>
      <Stack spacing={2} alignItems="center">
        <CircularProgress size={32} />
        <Typography color="text.secondary">{message}</Typography>
      </Stack>
    </Box>
  )
}

function Protected({
  children,
  permission,
  authStatus,
}: {
  children: ReactNode
  permission?: string
  authStatus: AuthStatus
}) {
  const location = useLocation()
  if (authStatus === 'checking') {
    return <LoadingScreen message="Loading..." />
  }
  if (authStatus !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (permission && !hasPermission(permission)) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ mb: 1.5, fontWeight: 700 }}>
          Permission denied
        </Typography>
        <Typography color="text.secondary">You do not have access to this page.</Typography>
      </Box>
    )
  }
  return <>{children}</>
}

function TopNavigation({ authStatus, onLogout }: { authStatus: AuthStatus; onLogout: () => void }) {
  const { t } = useI18n()
  const authed = authStatus === 'authenticated'
  const navItems = [
    { to: '/', label: t('nav.dashboard'), permission: 'dashboard.read' },
    { to: '/products', label: t('nav.products'), permission: 'catalog.products.read' },
    { to: '/orders', label: t('nav.orders'), permission: 'orders.read' },
    { to: '/coupons', label: t('nav.coupons'), permission: 'promotion.coupons.read' },
    { to: '/rbac', label: t('nav.rbac'), permission: 'tenant.rbac.manage' },
  ].filter((item) => !authed || hasPermission(item.permission))

  return (
    <Box sx={{ position: 'fixed', top: 16, left: 0, right: 0, zIndex: (theme) => theme.zIndex.appBar }}>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <AppBar
          position="static"
          color="inherit"
          sx={{
            width: 'min(1120px, calc(100% - 32px))',
            borderRadius: 12,
            bgcolor: 'rgba(255,255,255,0.75)',
            backdropFilter: 'saturate(180%) blur(12px)',
            border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
          }}
          elevation={0}
        >
          <Toolbar sx={{ display: 'flex', gap: 2 }}>
            <Typography variant="h6" sx={{ flex: 1, fontWeight: 700 }}>
              {t('nav.brand')}
            </Typography>
            <Stack direction="row" spacing={1.5} alignItems="center">
              {navItems.map((item) => (
                <Button key={item.to} component={Link} to={item.to}>
                  {item.label}
                </Button>
              ))}
              <Box sx={{ minWidth: 140 }}>
                <LanguageSwitcher />
              </Box>
              {authed && (
                <Button color="error" onClick={onLogout}>
                  {t('common.logout')}
                </Button>
              )}
            </Stack>
          </Toolbar>
        </AppBar>
      </Box>
    </Box>
  )
}

export default function App() {
  const { t } = useI18n()
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking')

  const refreshSession = useCallback(async () => {
    try {
      const session = await getSessionSnapshot()
      setAuthStatus(session?.authenticated ? 'authenticated' : 'unauthenticated')
    } catch {
      setAuthStatus('unauthenticated')
    }
  }, [])

  useEffect(() => {
    void refreshSession()
  }, [refreshSession])

  const handleLogout = useCallback(() => {
    void (async () => {
      try {
        await api.post('/auth/logout')
      } catch {}
      clearToken()
      setAuthStatus('unauthenticated')
      window.location.href = '/login'
    })()
  }, [])

  return (
    <BrowserRouter>
      <TopNavigation authStatus={authStatus} onLogout={handleLogout} />
      <Container maxWidth="lg" sx={{ pt: 12 }}>
        <Suspense
          fallback={
            <LoadingScreen message={t('common.loading')} />
          }
        >
          <Routes>
            <Route
              path="/login"
              element={
                authStatus === 'checking'
                  ? <LoadingScreen message={t('common.loading')} />
                  : authStatus === 'authenticated'
                    ? <Navigate to="/" replace />
                    : <Login onLoginSuccess={() => setAuthStatus('authenticated')} />
              }
            />
            <Route path="/" element={<Protected authStatus={authStatus} permission="dashboard.read"><Dashboard /></Protected>} />
            <Route path="/products" element={<Protected authStatus={authStatus} permission="catalog.products.read"><Products /></Protected>} />
            <Route path="/orders" element={<Protected authStatus={authStatus} permission="orders.read"><Orders /></Protected>} />
            <Route path="/coupons" element={<Protected authStatus={authStatus} permission="promotion.coupons.read"><Coupons /></Protected>} />
            <Route path="/rbac" element={<Protected authStatus={authStatus} permission="tenant.rbac.manage"><Rbac /></Protected>} />
          </Routes>
        </Suspense>
      </Container>
    </BrowserRouter>
  )
}
