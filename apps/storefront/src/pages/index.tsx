import Head from 'next/head'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  AppBar,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { useI18n } from '../state/i18n'

const drawerWidth = 320

function HamburgerIcon() {
  return (
    <Box
      component="span"
      sx={{
        width: 20,
        height: 2,
        bgcolor: 'text.primary',
        position: 'relative',
        display: 'inline-block',
        '&::before, &::after': {
          content: '""',
          position: 'absolute',
          left: 0,
          width: 20,
          height: 2,
          bgcolor: 'text.primary',
          transition: 'transform 200ms ease'
        },
        '&::before': { top: -6 },
        '&::after': { bottom: -6 }
      }}
    />
  )
}

export default function Home() {
  const theme = useTheme()
  const { t } = useI18n()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const [mobileOpen, setMobileOpen] = useState(false)

  const navLinks = useMemo(
    () => [
      { label: t('nav.products'), href: '/products' },
      { label: t('nav.cart'), href: '/cart' },
      { label: t('nav.account'), href: '/account' }
    ],
    [t]
  )

  const highlightFilters = useMemo(
    () => [
      { key: 'popular', label: t('nav.popular') },
      { key: 'new', label: t('nav.newArrivals') },
      { key: 'deals', label: t('nav.bestDeals') }
    ],
    [t]
  )

  const curatedCollections = useMemo(
    () => [
      {
        key: 'trending',
        title: t('home.collectionTrending'),
        description: t('home.collectionTrendingDescription')
      },
      {
        key: 'essentials',
        title: t('home.collectionEssentials'),
        description: t('home.collectionEssentialsDescription')
      },
      {
        key: 'sustainable',
        title: t('home.collectionSustainable'),
        description: t('home.collectionSustainableDescription')
      }
    ],
    [t]
  )

  const handleDrawerToggle = () => setMobileOpen((open) => !open)

  const drawer = (
    <Box sx={{ p: 3 }} role="presentation">
      <Stack spacing={3}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {t('nav.brand')}
          </Typography>
        </Box>
        <Divider />
        <List>
          {navLinks.map((item) => (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              onClick={() => setMobileOpen(false)}
            >
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
        <LanguageSwitcher fullWidth />
        <Button variant="outlined" onClick={() => setMobileOpen(false)}>
          {t('nav.close')}
        </Button>
      </Stack>
    </Box>
  )

  return (
    <>
      <Head>
        <title>{t('nav.brand')}</title>
        <meta name="description" content={t('nav.heroSubtitle')} />
      </Head>

      <Drawer
        variant="temporary"
        anchor="right"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: drawerWidth
          }
        }}
      >
        {drawer}
      </Drawer>

      <Box sx={{ position: 'fixed', top: 16, left: 0, right: 0, zIndex: (t) => t.zIndex.appBar }}>
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
              <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>
                {t('nav.brand')}
              </Typography>
              {isDesktop ? (
                <Stack direction="row" spacing={2} alignItems="center">
                  {navLinks.map((item) => (
                    <Button key={item.href} component={Link} href={item.href} color="inherit" variant="text">
                      {item.label}
                    </Button>
                  ))}
                  <Box sx={{ minWidth: 140 }}>
                    <LanguageSwitcher />
                  </Box>
                </Stack>
              ) : (
                <Button
                  onClick={handleDrawerToggle}
                  variant="outlined"
                  sx={{ borderRadius: 999, px: 2, display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <HamburgerIcon />
                  <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
                    {t('nav.menu')}
                  </Typography>
                </Button>
              )}
            </Toolbar>
          </AppBar>
        </Box>
      </Box>

      <Box
        sx={{
          pt: { xs: 18, md: 20 },
          pb: 10,
          background: 'linear-gradient(135deg, #e8f0ff 0%, #fff 100%)',
          borderBottom: '1px solid #eee'
        }}
      >
        <Container maxWidth="lg">
          <Stack spacing={3} sx={{ maxWidth: 640 }}>
            <Typography variant="h3" sx={{ fontWeight: 800 }}>
              {t('nav.heroTitle')}
            </Typography>
            <Typography color="text.secondary">{t('nav.heroSubtitle')}</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button component={Link} href="/products" size="large">
                {t('nav.browseProducts')}
              </Button>
              <Button component={Link} href="/cart" variant="outlined" size="large">
                {t('nav.viewCart')}
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Stack spacing={4}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
              {t('nav.highlights')}
            </Typography>
            <Typography color="text.secondary">
              {t('home.curatedSubtitle')}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 3 }}>
              {highlightFilters.map((filter) => (
                <Button
                  key={filter.key}
                  component={Link}
                  href={`/category/${filter.key}`}
                  variant="outlined"
                >
                  {filter.label}
                </Button>
              ))}
            </Stack>
          </Box>

          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
              {t('home.curatedHeading')}
            </Typography>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={3}
              sx={{
                '& > *': {
                  flex: 1
                }
              }}
            >
              {curatedCollections.map((collection) => (
                <Paper
                  key={collection.key}
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    background: 'linear-gradient(160deg, rgba(148, 163, 184, 0.08) 0%, rgba(255,255,255,0.9) 100%)'
                  }}
                >
                  <Stack spacing={2}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {collection.title}
                    </Typography>
                    <Typography color="text.secondary">{collection.description}</Typography>
                    <Button
                      component={Link}
                      href={`/category/${collection.key}`}
                      size="small"
                    >
                      {t('nav.browseProducts')}
                    </Button>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Box>
        </Stack>
      </Container>
    </>
  )
}
