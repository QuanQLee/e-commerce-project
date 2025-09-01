import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { AppBar, Toolbar, Typography, Container, Button, Stack, Box } from '@mui/material'
import Dashboard from '../views/Dashboard'
import Products from '../views/Products'
import Orders from '../views/Orders'
import Coupons from '../views/Coupons'

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
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/coupons" element={<Coupons />} />
        </Routes>
      </Container>
    </BrowserRouter>
  )
}
