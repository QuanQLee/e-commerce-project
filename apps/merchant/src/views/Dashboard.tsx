import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, Typography, Box, Skeleton, Stack } from '@mui/material'
import type { AxiosError } from 'axios'
import api from '../api'
import { useI18n } from '../state/i18n'

const cardKeys: Array<'sales' | 'orders' | 'products' | 'coupons'> = ['sales', 'orders', 'products', 'coupons']
const metricCandidates: Record<(typeof cardKeys)[number], string[]> = {
  sales: ['sales', 'gmv', 'revenue', 'turnover'],
  orders: ['orders', 'orderCount', 'order_total', 'order_volume'],
  products: ['products', 'productCount', 'catalog', 'sku_total'],
  coupons: ['coupons', 'couponCount', 'promotion', 'activeCoupons']
}

function pickMetricValue(payload: Record<string, unknown> | null | undefined, key: (typeof cardKeys)[number]) {
  if (!payload) return null
  for (const candidate of metricCandidates[key]) {
    const value = payload[candidate]
    if (typeof value === 'number') return value
    if (value && typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
      const parsed = (value as { value?: number }).value
      if (typeof parsed === 'number') return parsed
    }
  }
  return null
}

function formatValue(value: number, key: (typeof cardKeys)[number], locale: string, currency: string) {
  if (Number.isNaN(value)) return '¡ª'
  if (key === 'sales') {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: value < 10 ? 2 : 0,
    }).format(value)
  }
  if (Math.abs(value) > 9999) {
    return new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  }
  return value.toLocaleString(locale)
}

type MetricsErrorResponse = {
  message?: string
}

export default function Dashboard() {
  const { t, locale, currency } = useI18n()
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    api
      .get('/api/v1/analytics/metrics')
      .then((response) => {
        if (!active) return
        setMetrics(response.data ?? {})
      })
      .catch((err: unknown) => {
        const apiError = err as AxiosError<MetricsErrorResponse>
        console.error(apiError)
        if (!active) return
        setError(apiError.response?.data?.message || apiError.message || t('common.errorGeneric'))
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [t])

  const values = useMemo(() => {
    return cardKeys.map((key) => ({
      key,
      label: t(`dashboard.cards.${key}`),
      value: pickMetricValue(metrics, key),
    }))
  }, [metrics, t])

  return (
    <Box
      display="grid"
      gap={2}
      gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }}
    >
      {loading &&
        cardKeys.map((key) => (
          <Card key={key}>
            <CardContent>
              <Skeleton variant="text" width="40%" height={20} />
              <Skeleton variant="text" width="60%" height={36} sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        ))}

      {!loading && error && (
        <Card sx={{ gridColumn: { xs: 'span 1', sm: 'span 2', md: 'span 4' } }}>
          <CardContent>
            <Typography color="error" gutterBottom>
              {error}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('common.retry')}
            </Typography>
          </CardContent>
        </Card>
      )}

      {!loading && !error &&
        values.map((item) => (
          <Card key={item.key}>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="overline" color="text.secondary">
                  {item.label}
                </Typography>
                <Typography variant="h5">
                  {typeof item.value === 'number'
                    ? formatValue(item.value, item.key, locale, currency)
                    : t('dashboard.placeholder')}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        ))}
    </Box>
  )
}

