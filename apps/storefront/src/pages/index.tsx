import Head from 'next/head'
import Link from 'next/link'
import { Container, Typography, Button, Stack, Box, AppBar, Toolbar } from '@mui/material'

export default function Home() {
  return (
    <>
      <Head>
        <title>Storefront</title>
        <meta name="description" content="Modern e-commerce storefront" />
      </Head>
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
            <Toolbar sx={{ display: 'flex', gap: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>Storefront</Typography>
              <Button component={Link} href="/products">Products</Button>
              <Button component={Link} href="/cart">Cart</Button>
              <Button component={Link} href="/account">Account</Button>
            </Toolbar>
          </AppBar>
        </Box>
      </Box>
      <Box sx={{ pt: 16, pb: 10, background: 'linear-gradient(135deg, #e8f0ff 0%, #fff 100%)', borderBottom: '1px solid #eee' }}>
        <Container maxWidth="lg">
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>Storefront</Typography>
          <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 640 }}>
            A modern e‑commerce starter. Browse products, add to cart and checkout.
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button component={Link} href="/products" variant="contained" size="large">Browse Products</Button>
            <Button component={Link} href="/cart" variant="outlined" size="large">View Cart</Button>
          </Stack>
        </Container>
      </Box>
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Highlights</Typography>
        <Stack direction="row" spacing={2}>
          <Button component={Link} href="/products" variant="text">Popular</Button>
          <Button component={Link} href="/products" variant="text">New Arrivals</Button>
          <Button component={Link} href="/products" variant="text">Best Deals</Button>
        </Stack>
      </Container>
    </>
  )
}
