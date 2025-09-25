import { useRouter } from 'next/router'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Chip,
  Container,
  Grid,
  Skeleton,
  Stack,
  Typography
} from '@mui/material'
import api from '../../lib/api'
import { useCart } from '../../state/cart'
import { useI18n } from '../../state/i18n'

interface Product {
  id: string
  name: string
  description?: string
  price: number
  imageUrl?: string
  gallery?: string[]
  category?: string
  stock?: number
  currency?: string
  attributes?: Record<string, string>
}

const FALLBACK_IMAGE =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgdmlld0JveD0iMCAwIDUwMCA1MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjUwMCIgaGVpZ2h0PSI1MDAiIGZpbGw9IiNFMEUxRTQiLz48dGV4dCB4PSIyNTAiIHk9IjI1MCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyZWFsIiBmb250LXNpemU9IjI0Ij5JbWFnZSBVbmF2YWlsYWJsZTwvdGV4dD48L3N2Zz4='

export default function ProductDetail() {
  const router = useRouter()
  const idParam = router.query.id
  const id = Array.isArray(idParam) ? idParam[0] : idParam
  const { addItem } = useCart()
  const { t, locale, currency } = useI18n()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol'
      }),
    [locale, currency]
  )

  useEffect(() => {
    if (!id) return
    let active = true
    setLoading(true)
    setError(null)
    api
      .get<Product>(`/api/v1/catalog/products/${id}`)
      .then((response) => {
        if (!active) return
        const data = response.data
        if (data) {
          setProduct(data)
        } else {
          setError(t('products.errorGeneric'))
        }
      })
      .catch((err: any) => {
        console.error(err)
        if (!active) return
        setError(err?.response?.data?.message || err?.message || t('products.errorGeneric'))
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id, t])

  const handleAddToCart = () => {
    if (!product) return
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      currency: product.currency || currency
    })
  }

  return (
    <Container sx={{ py: 5 }}>
      <Stack spacing={3}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link href="/">{t('nav.brand')}</Link>
          <Link href="/products">{t('nav.products')}</Link>
          <Typography color="text.secondary">{product?.name || id}</Typography>
        </Breadcrumbs>

        {loading && (
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Skeleton variant="rectangular" height={380} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Stack spacing={2}>
                <Skeleton variant="text" width="60%" height={48} />
                <Skeleton variant="text" width="40%" height={36} />
                {Array.from({ length: 4 }).map((_, idx) => (
                  <Skeleton key={idx} variant="text" />
                ))}
              </Stack>
            </Grid>
          </Grid>
        )}

        {!loading && error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && product && (
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  position: 'relative',
                  borderRadius: 3,
                  overflow: 'hidden',
                  boxShadow: '0 12px 32px rgba(15,23,42,0.12)',
                  minHeight: 360,
                  backgroundColor: 'rgba(15,23,42,0.05)'
                }}
              >
                <Image
                  src={product.imageUrl || FALLBACK_IMAGE}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  style={{ objectFit: 'cover' }}
                />
              </Box>
              {product.gallery && product.gallery.length > 1 && (
                <Stack direction="row" spacing={1.5} sx={{ mt: 2, overflowX: 'auto' }}>
                  {product.gallery.map((url) => (
                    <Box key={url} sx={{ position: 'relative', width: 96, height: 96, borderRadius: 2, overflow: 'hidden' }}>
                      <Image src={url} alt={product.name} fill sizes="96px" style={{ objectFit: 'cover' }} />
                    </Box>
                  ))}
                </Stack>
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              <Stack spacing={3}>
                <Stack spacing={1}>
                  <Typography variant="h4" fontWeight={800}>
                    {product.name}
                  </Typography>
                  <Typography variant="h5" color="primary" fontWeight={700}>
                    {formatter.format(product.price)}
                  </Typography>
                  {product.category && <Chip label={product.category} variant="outlined" />}
                  {typeof product.stock === 'number' && (
                    <Typography variant="body2" color="text.secondary">
                      {product.stock > 0 ? t('products.stockLabel', { value: product.stock }) : t('products.stockOut')}
                    </Typography>
                  )}
                </Stack>

                {product.description && (
                  <Typography color="text.secondary">{product.description}</Typography>
                )}

                <Stack direction="row" spacing={2}>
                  <Button variant="contained" size="large" onClick={handleAddToCart}>
                    {t('products.actionAddToCart')}
                  </Button>
                  <Button size="large" component={Link} href="/cart" variant="outlined">
                    {t('nav.cart')}
                  </Button>
                </Stack>

                {product.attributes && (
                  <Box sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', p: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      {t('nav.highlights')}
                    </Typography>
                    <Stack spacing={1}>
                      {Object.entries(product.attributes).map(([key, value]) => (
                        <Stack key={key} direction="row" spacing={1}>
                          <Typography fontWeight={600}>{key}:</Typography>
                          <Typography color="text.secondary">{value}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                )}
              </Stack>
            </Grid>
          </Grid>
        )}
      </Stack>
    </Container>
  )
}