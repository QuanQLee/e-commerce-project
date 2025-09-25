import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import {
  Alert,
  Box,
  Card,
  CardContent,
  Collapse,
  Container,
  IconButton,
  Stack,
  Typography
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import api from '../../lib/api'
import { useI18n } from '../../state/i18n'

interface OrderItem {
  name: string
  price: number
  quantity?: number
}

interface Order {
  id: string
  createdAt?: string
  status: string
  totalPrice: number
  currency?: string
  items: OrderItem[]
}

export default function OrdersHistory() {
  const { locale, currency, t } = useI18n()
  const router = useRouter()
  const highlight = typeof router.query.highlight === 'string' ? router.query.highlight : null
  const [orders, setOrders] = useState<Order[]>([])
  const [expanded, setExpanded] = useState<string | null>(highlight)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const highlightRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    api
      .get<Order[]>('/api/v1/order/orders')
      .then((res) => setOrders(res.data || []))
      .catch((err) => {
        console.error(err)
        setError(t('account.orders.loadFailed'))
      })
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => {
    if (!highlightRef.current) return
    highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [orders])

  const amountFormatter = useMemo(() => new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency || 'USD',
    currencyDisplay: 'narrowSymbol'
  }), [currency, locale])

  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }), [locale])

  const toggle = (orderId: string) => {
    setExpanded((current) => (current === orderId ? null : orderId))
  }

  return (
    <Container sx={{ py: 5 }}>
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={800}>
          {t('account.orders.title')}
        </Typography>

        {loading && <Alert severity="info">{t('account.orders.loading')}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && orders.length === 0 && (
          <Alert severity="info">{t('account.orders.empty')}</Alert>
        )}

        {!loading && !error && orders.map((order) => {
          const isHighlight = highlight === order.id
          return (
            <Card key={order.id} ref={isHighlight ? highlightRef : undefined} sx={{ border: isHighlight ? '2px solid' : '1px solid', borderColor: isHighlight ? 'primary.main' : 'divider' }}>
              <CardContent>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }}>
                  <Stack spacing={0.5}>
                    <Typography fontWeight={700}>{t('account.orders.orderId', { id: order.id })}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {order.createdAt ? dateFormatter.format(new Date(order.createdAt)) : t('account.orders.unknownDate')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t(`account.orders.status.${order.status?.toLowerCase?.() || 'unknown'}`, { fallback: order.status })}
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography fontWeight={700}>{amountFormatter.format(order.totalPrice)}</Typography>
                    <IconButton onClick={() => toggle(order.id)} aria-label={t('account.orders.toggle')} size="small">
                      {expanded === order.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Stack>
                </Stack>

                <Collapse in={expanded === order.id} timeout="auto" unmountOnExit>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                      {t('account.orders.itemsHeading')}
                    </Typography>
                    <Stack spacing={1}>
                      {order.items.map((item, index) => (
                        <Stack key={`${order.id}-${index}`} direction="row" justifyContent="space-between">
                          <Typography>
                            {item.name} × {item.quantity ?? 1}
                          </Typography>
                          <Typography>{amountFormatter.format(item.price)}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          )
        })}
      </Stack>
    </Container>
  )
}
