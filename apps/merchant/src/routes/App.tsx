import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import { AppBar, Toolbar, Typography, Container, Button, Stack, Box } from '@mui/material'
import Dashboard from '../views/Dashboard'
import Products from '../views/Products'
import Orders from '../views/Orders'
import Coupons from '../views/Coupons'
import Login from '../views/Login'
import type { ReactNode } from 'react'

function isAuthed() {
  const token = localStorage.getItem('access_token')
  const exp = Number(localStorage.getItem('expires_at') || 0)
  if (!token) return false
  if (exp && Date.now() > exp) return false
  return true
}

function Protected({ children }: { children: ReactNode }) {
  const authed = isAuthed()
  const location = useLocation()
  if (!authed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      {/* Floating translucent top bar */}
      <Box sx={{ position: 'fixed', top: 16, left: 0, right: 0, zIndex: (t) => t.zIndex.appBar }}>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <AppBar
            position="static"
            color="inherit"
            sx={{
              width: 'min(1120px, calc(100% - 32px))',
              borderRadius: 12,
              bgcolor: 'rgba(255,255,255,0.55)',
              backdropFilter: 'saturate(180%) blur(10px)',
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
            }}
            elevation={0}
          >
            <Toolbar>
              <Typography variant="h6" sx={{ flex: 1, fontWeight: 700 }}>Merchant Portal</Typography>
              <Stack direction="row" spacing={1}>
                <Button component={Link} to="/">Dashboard</Button>
                <Button component={Link} to="/products">Products</Button>
                <Button component={Link} to="/orders">Orders</Button>
                <Button component={Link} to="/coupons">Coupons</Button>
              </Stack>
            </Toolbar>
          </AppBar>
        </Box>
      </Box>
      <Container maxWidth="lg" sx={{ pt: 12 }}>
        <Routes>
          <Route path="/login" element={isAuthed() ? <Navigate to="/" replace /> : <Login />} />

          <Route path="/" element={<Protected><Dashboard /></Protected>} />
          <Route path="/products" element={<Protected><Products /></Protected>} />
          <Route path="/orders" element={<Protected><Orders /></Protected>} />
          <Route path="/coupons" element={<Protected><Coupons /></Protected>} />
        </Routes>
      </Container>
    </BrowserRouter>
  )
}
