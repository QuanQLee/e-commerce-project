import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Skeleton,
  Snackbar,
  Stack,
  Typography
} from '@mui/material'
import api from '../lib/api'
import { useCart } from '../state/cart'
import { useI18n } from '../state/i18n'
import LanguageSwitcher from '../components/LanguageSwitcher'

type Product = {
  id: string
  name: string
  description?: string
  price: number
  imageUrl?: string
  category?: string
  stock?: number
  currency?: string
}

const FALLBACK_IMAGE =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgdmlld0JveD0iMCAwIDgwMCA2MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHJlY3Qgd2lkdGg9IjgwMCIgaGVpZ2h0PSI2MDAiIGZpbGw9IiNGMEYyRjUiIC8+CiAgPHRleHQgeD0iNDAwIiB5PSIzMDAiIGR5PSIuMyIgZm9udC1mYW1pbHk9IkFyZWFsIiBmb250LXNpemU9IjUxIiBmaWxsPSIjOTlBQkIiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4='

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const { addItem } = useCart()
  const { t, locale, currency: defaultCurrency } = useI18n()

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: defaultCurrency,
        currencyDisplay: 'narrowSymbol'
      }),
    [locale, defaultCurrency]
  )

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<Product[]>('/api/v1/catalog/products')
      setProducts(res.data || [])
    } catch (err: unknown) {
      const axiosError = err as { response?: { status?: number; data?: { message?: string } } }
      const status = axiosError.response?.status
      if (status === 401) {
        setError(t('products.errorRequiresLogin'))
      } else {
        setError(axiosError.response?.data?.message || t('products.errorGeneric'))
      }
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleCardClick = (id: string, isActive: boolean) => {
    if (isActive) {
      setActiveId(null)
      return
    }
    setActiveId(id)
    requestAnimationFrame(() => {
      const el = itemRefs.current[id]
      el?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    })
  }

  const handleAddToCart = (product: Product) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      currency: product.currency || defaultCurrency
    })
    setToast(t('products.toastAdded', { name: product.name }))
  }

  const renderSkeletons = () => (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
        gap: 3
      }}
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} sx={{ height: { xs: 280, sm: 320 }, borderRadius: 3, overflow: 'hidden' }}>
          <Skeleton variant="rectangular" height="100%" animation="wave" />
        </Card>
      ))}
    </Box>
  )

  const renderEmptyState = () => (
    <Box
      sx={{
        borderRadius: 3,
        border: '1px dashed',
        borderColor: 'divider',
        p: { xs: 4, md: 6 },
        textAlign: 'center',
        bgcolor: 'background.paper'
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
        {t('products.emptyTitle')}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {t('products.emptySubtitle')}
      </Typography>
      <Button variant="contained" onClick={fetchProducts}>
        {t('products.actionRetry')}
      </Button>
    </Box>
  )

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} sx={{ mb: 3 }} spacing={2}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            {t('products.title')}
          </Typography>
          <Typography color="text.secondary">{t('products.subtitle')}</Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: { xs: '100%', sm: 'auto' } }} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <Box sx={{ minWidth: { xs: '100%', sm: 160 } }}>
            <LanguageSwitcher size="small" fullWidth />
          </Box>
          <Button variant="outlined" onClick={() => setActiveId(null)} disabled={activeId === null}>
            {t('products.actionReset')}
          </Button>
        </Stack>
      </Stack>

      {loading && renderSkeletons()}

      {!loading && error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={fetchProducts}>
              {t('products.actionRetry')}
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {!loading && !error && products.length === 0 && renderEmptyState()}

      {!loading && !error && products.length > 0 && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gap: 3
          }}
        >
          {products.map((product, idx) => {
            const active = activeId === product.id
            const dimmed = activeId !== null && !active
            const isOutOfStock = typeof product.stock === 'number' && product.stock <= 0
            return (
              <Card
                key={product.id}
                ref={(el) => {
                  itemRefs.current[product.id] = el
                }}
                onClick={() => handleCardClick(product.id, active)}
                sx={{
                  position: 'relative',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  height: { xs: 320, md: 360 },
                  borderRadius: 3,
                  boxShadow: active ? '0 16px 50px rgba(0,0,0,0.25)' : '0 6px 24px rgba(0,0,0,0.12)',
                  transform: active ? 'translateY(-4px) scale(1.03)' : `translateY(${(idx % 3) - 1}px) scale(0.98)`,
                  transition: 'transform 300ms ease, box-shadow 300ms ease, filter 300ms ease, opacity 300ms ease',
                  zIndex: active ? 2 : 1,
                  filter: dimmed ? 'blur(1px) saturate(0.8)' : 'none',
                  opacity: dimmed ? 0.7 : 1,
                  scrollMarginTop: 96,
                  '&:hover': { transform: active ? 'translateY(-6px) scale(1.035)' : 'translateY(-2px) scale(1.01)' }
                }}
              >
                <Box sx={{ position: 'absolute', inset: 0 }}>
                  <Image
                    src={product.imageUrl || FALLBACK_IMAGE}
                    alt={product.name}
                    fill
                    sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    priority={idx < 2}
                    style={{
                      objectFit: 'cover',
                      transform: active ? 'scale(1.06)' : 'scale(1.02)',
                      transition: 'transform 500ms ease',
                      filter: active ? 'none' : 'grayscale(10%)'
                    }}
                  />
                </Box>

                <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 20%, rgba(0,0,0,0.55) 100%)' }} />

                {!!product.category && (
                  <Chip
                    label={product.category}
                    color={active ? 'primary' : 'default'}
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      bgcolor: active ? 'primary.main' : 'rgba(255,255,255,0.85)',
                      color: active ? 'primary.contrastText' : 'inherit',
                      backdropFilter: 'blur(6px)'
                    }}
                  />
                )}

                {isOutOfStock && (
                  <Chip
                    label={t('products.stockOut')}
                    color="warning"
                    size="small"
                    sx={{ position: 'absolute', top: 12, right: 12, bgcolor: 'rgba(255,171,0,0.85)' }}
                  />
                )}

                <CardContent
                  sx={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    color: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    p: 2.2
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {product.name}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        {formatter.format(product.price)}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="contained"
                      color="secondary"
                      disabled={isOutOfStock}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAddToCart(product)
                      }}
                    >
                      {isOutOfStock ? t('products.actionSoldOut') : t('products.actionAddToCart')}
                    </Button>
                  </Stack>

                  <Box
                    sx={{
                      maxHeight: active ? 200 : 0,
                      overflow: 'hidden',
                      transition: 'max-height 300ms ease'
                    }}
                  >
                    <Typography variant="body2" sx={{ mt: 1, color: 'rgba(255,255,255,0.92)' }}>
                      {product.description || t('products.noDescription')}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1.2 }}>
                      <Chip size="small" label={t('products.badgeFreeShipping')} sx={{ bgcolor: 'rgba(255,255,255,0.14)', color: 'white' }} />
                      <Chip size="small" label={t('products.badgeReturns')} sx={{ bgcolor: 'rgba(255,255,255,0.14)', color: 'white' }} />
                    </Stack>
                  </Box>
                </CardContent>
              </Card>
            )
          })}
        </Box>
      )}

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setToast(null)} severity="success" variant="filled" sx={{ width: '100%' }}>
          {toast}
        </Alert>
      </Snackbar>
    </Container>
  )
}

