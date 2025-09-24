import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import { AppBar, Toolbar, Typography, Container, Button, Stack, Box, CircularProgress } from '@mui/material'
import { Suspense, lazy, type ReactNode } from 'react'
import Login from '../views/Login'
import { isAuthed, clearToken } from '../auth'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { useI18n } from '../state/i18n'

const Dashboard = lazy(() => import('../views/Dashboard'))
const Products = lazy(() => import('../views/Products'))
const Orders = lazy(() => import('../views/Orders'))
const Coupons = lazy(() => import('../views/Coupons'))

function Protected({ children }: { children: ReactNode }) {
  const authed = isAuthed()
  const location = useLocation()
  if (!authed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}

function TopNavigation() {
  const { t } = useI18n()
  const authed = isAuthed()
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
              <Button component={Link} to="/">
                {t('nav.dashboard')}
              </Button>
              <Button component={Link} to="/products">
                {t('nav.products')}
              </Button>
              <Button component={Link} to="/orders">
                {t('nav.orders')}
              </Button>
              <Button component={Link} to="/coupons">
                {t('nav.coupons')}
              </Button>
              <Box sx={{ minWidth: 140 }}>
                <LanguageSwitcher />
              </Box>
              {authed && (
                <Button
                  color="error"
                  onClick={() => {
                    clearToken()
                    window.location.href = '/login'
                  }}
                >
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
  return (
    <BrowserRouter>
      <TopNavigation />
      <Container maxWidth="lg" sx={{ pt: 12 }}>
        <Suspense
          fallback={
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 8 }}>
              <Stack spacing={2} alignItems="center">
                <CircularProgress size={32} />
                <Typography color="text.secondary">{t('common.loading')}</Typography>
              </Stack>
            </Box>
          }
        >
          <Routes>
            <Route path="/login" element={isAuthed() ? <Navigate to="/" replace /> : <Login />} />
            <Route path="/" element={<Protected><Dashboard /></Protected>} />
            <Route path="/products" element={<Protected><Products /></Protected>} />
            <Route path="/orders" element={<Protected><Orders /></Protected>} />
            <Route path="/coupons" element={<Protected><Coupons /></Protected>} />
          </Routes>
        </Suspense>
      </Container>
    </BrowserRouter>
  )
}
