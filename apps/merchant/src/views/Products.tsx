import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import api from '../api'
import { useI18n } from '../state/i18n'

type Product = {
  id: string
  name: string
  description?: string
  price: number
  imageUrl?: string
  category?: string
  stock?: number
}

export default function Products() {
  const [keyword, setKeyword] = useState('')
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { t, locale, currency } = useI18n()

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol'
      }),
    [locale, currency]
  )

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/v1/catalog/products')
      setItems(res.data || [])
    } catch (err: unknown) {
      const axiosError = err as { response?: { status?: number; data?: { message?: string } }; message?: string }
      const status = axiosError.response?.status
      if (status === 401) {
        setError(t('products.error401'))
      } else {
        setError(axiosError.response?.data?.message || axiosError.message || t('products.errorGeneric'))
      }
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filtered = keyword
    ? items.filter((product) => product.name.toLowerCase().includes(keyword.toLowerCase()))
    : items

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
          {t('products.title')}
        </Typography>
        <Typography color="text.secondary">{t('products.subtitle')}</Typography>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
        <TextField
          size="small"
          label={t('products.searchPlaceholder')}
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          sx={{ width: { xs: '100%', sm: 260 } }}
        />
        <Button variant="contained" onClick={fetchData} disabled={loading}>
          {t('products.reload')}
        </Button>
        <Button variant="outlined" disabled>
          {t('products.add')}
        </Button>
      </Stack>

      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CircularProgress size={20} />
          <Typography color="text.secondary">{t('common.loading')}</Typography>
        </Box>
      )}

      {!loading && error && (
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={fetchData}>{t('products.reload')}</Button>}>
          {error}
        </Alert>
      )}

      {!loading && !error && filtered.length === 0 && (
        <Card>
          <CardContent>
            <Typography color="text.secondary">{t('products.empty')}</Typography>
          </CardContent>
        </Card>
      )}

      {!loading && !error && filtered.map((product) => (
        <Card key={product.id}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {product.name}
            </Typography>
            {product.category && (
              <Typography color="text.secondary" variant="body2" sx={{ mb: 0.5 }}>
                {product.category}
              </Typography>
            )}
            {product.description && (
              <Typography color="text.secondary" sx={{ mb: 1 }}>
                {product.description}
              </Typography>
            )}
            <Typography sx={{ fontWeight: 700 }}>
              {formatter.format(product.price)}
            </Typography>
            {typeof product.stock === 'number' && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {t('products.stockLabel', { value: product.stock })}
              </Typography>
            )}
          </CardContent>
        </Card>
      ))}
    </Stack>
  )
}
