import { useRouter } from 'next/router'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Container,
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
  category?: string
  stock?: number
  currency?: string
}

const FALLBACK_IMAGE =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNFMEUxRTQiLz48dGV4dCB4PSIxNTAiIHk9IjEwMCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyZWFsIiBmb250LXNpemU9IjIwIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='

const slugToTranslationKey: Record<string, string> = {
  popular: 'nav.popular',
  new: 'nav.newArrivals',
  deals: 'nav.bestDeals'
}

export default function CategoryPage() {
  const router = useRouter()
  const slugParam = router.query.slug
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam
  const { addItem } = useCart()
  const { t, locale, currency } = useI18n()
  const [items, setItems] = useState<Product[]>([])
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
    if (!slug) return
    let active = true
    setLoading(true)
    setError(null)
    api
      .get<Product[]>('/api/v1/catalog/products', {
        params: { category: slug, segment: slug }
      })
      .then((response) => {
        if (!active) return
        setItems(response.data || [])
      })
      .catch((err: unknown) => {
        console.error(err)
        if (!active) return
        let message: string | undefined
        if (typeof err === 'object' && err !== null) {
          const info = err as { response?: { data?: { message?: string } }; message?: string }
          message = info.response?.data?.message ?? info.message
        } else if (typeof err === 'string') {
          message = err
        }
        setError(message || t('products.errorGeneric'))
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [slug, t])

  const title = slug ? t(slugToTranslationKey[slug] ?? 'nav.products') : t('nav.products')

  return (
    <Container sx={{ py: 5 }}>
      <Stack spacing={3}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link href="/">{t('nav.brand')}</Link>
          <Typography color="text.secondary">{title}</Typography>
        </Breadcrumbs>

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h4" fontWeight={800}>
            {title}
          </Typography>
          <Button component={Link} href="/products" variant="text">
            {t('nav.products')}
          </Button>
        </Stack>

        {loading && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              gap: 2
            }}
          >
            {Array.from({ length: 6 }).map((_, idx) => (
              <Skeleton key={idx} variant="rectangular" height={200} animation="wave" />
            ))}
          </Box>
        )}

        {!loading && error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && items.length === 0 && (
          <Alert severity="info">{t('products.emptyTitle')}</Alert>
        )}

        {!loading && !error && items.length > 0 && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
              gap: 3
            }}
          >
            {items.map((product) => (
              <Card key={product.id} sx={{ display: 'flex', flexDirection: 'column' }}>
                <Box
                  component="img"
                  src={product.imageUrl || FALLBACK_IMAGE}
                  alt={product.name}
                  sx={{ width: '100%', height: 200, objectFit: 'cover' }}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Stack spacing={1}>
                    <Typography variant="h6" fontWeight={700}>
                      {product.name}
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                      {product.description || t('products.noDescription')}
                    </Typography>
                    <Typography fontWeight={700}>{formatter.format(product.price)}</Typography>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() =>
                          addItem({
                            id: product.id,
                            name: product.name,
                            price: product.price,
                            imageUrl: product.imageUrl,
                            currency: product.currency || currency
                          })
                        }
                      >
                        {t('products.actionAddToCart')}
                      </Button>
                      <Button size="small" component={Link} href={`/product/${product.id}`}>
                        {t('nav.products')}
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Stack>
    </Container>
  )
}