import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from '@mui/material'
import api from '../api'
import { useI18n } from '../state/i18n'

type OrderStatus = 'CREATED' | 'PAID' | 'FULFILLED' | 'CANCELLED'

type OrderItem = {
  productName: string
  price: number
  quantity?: number
}

type Order = {
  id: string
  createdAt?: string
  status: OrderStatus
  totalPrice: number
  currency?: string
  items: OrderItem[]
}

type DialogState = {
  open: boolean
  order: Order | null
}

const STATUS_OPTIONS: OrderStatus[] = ['CREATED', 'PAID', 'FULFILLED', 'CANCELLED']

export default function Orders() {
  const { t, locale, currency } = useI18n()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [dialog, setDialog] = useState<DialogState>({ open: false, order: null })
  const [updating, setUpdating] = useState(false)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get<Order[]>('/api/v1/order/orders')
      setOrders(response.data || [])
    } catch (err: unknown) {
      console.error(err)
      setError(t('orders.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return orders
    return orders.filter((order) => order.status === statusFilter)
  }, [orders, statusFilter])

  const openDialog = (order: Order) => setDialog({ open: true, order })
  const closeDialog = () => setDialog({ open: false, order: null })

  const handleStatusChange = async (nextStatus: OrderStatus) => {
    if (!dialog.order) return
    setUpdating(true)
    try {
      await api.patch(`/api/v1/order/orders/${dialog.order.id}`, { status: nextStatus })
      await fetchOrders()
      setDialog((prev) => (prev.order ? { open: true, order: { ...prev.order, status: nextStatus } } : prev))
    } catch (err) {
      console.error(err)
      setError(t('orders.updateFailed'))
    } finally {
      setUpdating(false)
    }
  }

  const formatters = useMemo(() => ({
    currency: new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol'
    }),
    date: new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }), [currency, locale])

  const formatAmount = (value: number, orderCurrency?: string) => {
    if (orderCurrency && orderCurrency !== currency) {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: orderCurrency,
        currencyDisplay: 'narrowSymbol'
      }).format(value)
    }
    return formatters.currency.format(value)
  }


  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          {t('orders.title')}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="order-status-filter">{t('orders.filter')}</InputLabel>
            <Select
              labelId="order-status-filter"
              label={t('orders.filter')}
              value={statusFilter}
              onChange={(event: SelectChangeEvent<OrderStatus | 'all'>) => setStatusFilter(event.target.value as OrderStatus | 'all')}
            >
              <MenuItem value="all">{t('orders.filterAll')}</MenuItem>
              {STATUS_OPTIONS.map((value) => (
                <MenuItem key={value} value={value}>
                  {t(`orders.status.${value.toLowerCase()}`)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={fetchOrders} disabled={loading}>
            {t('orders.reload')}
          </Button>
        </Stack>
      </Stack>

      {loading && (
        <Card>
          <CardContent>
            <Stack spacing={1.5}>
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} variant="rectangular" height={48} />
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {!loading && error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && filtered.length === 0 && (
        <Card>
          <CardContent>
            <Typography color="text.secondary">{t('orders.empty')}</Typography>
          </CardContent>
        </Card>
      )}

      {!loading && !error && filtered.length > 0 && (
        <Card>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('orders.table.id')}</TableCell>
                <TableCell>{t('orders.table.created')}</TableCell>
                <TableCell align="right">{t('orders.table.total')}</TableCell>
                <TableCell>{t('orders.table.status')}</TableCell>
                <TableCell width={120}>{t('orders.table.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((order) => (
                <TableRow key={order.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{order.id}</TableCell>
                  <TableCell>
                    {order.createdAt ? formatters.date.format(new Date(order.createdAt)) : '--'}
                  </TableCell>
                  <TableCell align="right">{formatAmount(order.totalPrice, order.currency)}</TableCell>
                  <TableCell sx={{ textTransform: 'capitalize' }}>{t(`orders.status.${order.status.toLowerCase()}`)}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => openDialog(order)}>
                      {t('orders.viewDetails')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={dialog.open} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{t('orders.detailTitle', { id: dialog.order?.id ?? '' })}</DialogTitle>
        <DialogContent dividers>
          {!dialog.order && <Typography>{t('orders.noSelection')}</Typography>}
          {dialog.order && (
            <Stack spacing={2}>
              <Stack spacing={0.5}>
                <Typography variant="subtitle2" color="text.secondary">
                  {t('orders.table.status')}
                </Typography>
                <Typography fontWeight={600} sx={{ textTransform: 'capitalize' }}>
                  {t(`orders.status.${dialog.order.status.toLowerCase()}`)}
                </Typography>
              </Stack>
              <Stack spacing={0.5}>
                <Typography variant="subtitle2" color="text.secondary">
                  {t('orders.table.total')}
                </Typography>
                <Typography fontWeight={600}>{formatAmount(dialog.order.totalPrice, dialog.order.currency)}</Typography>
              </Stack>
              <Stack spacing={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  {t('orders.itemsHeading')}
                </Typography>
                {dialog.order.items.map((item, idx) => (
                  <Box key={`${dialog.order?.id}-${item.productName}-${idx}`} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                    <Box>
                      <Typography fontWeight={600}>{item.productName}</Typography>
                      {item.quantity && (
                        <Typography variant="caption" color="text.secondary">
                          {t('orders.quantityLabel', { value: item.quantity })}
                        </Typography>
                      )}
                    </Box>
                    <Typography>{formatAmount(item.price, dialog.order?.currency)}</Typography>
                  </Box>
                ))}
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>{t('orders.close')}</Button>
          {dialog.order && (
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="order-status-update">{t('orders.updateLabel')}</InputLabel>
              <Select
                labelId="order-status-update"
                label={t('orders.updateLabel')}
                value={dialog.order.status}
                onChange={(event) => handleStatusChange(event.target.value as OrderStatus)}
                disabled={updating}
              >
                {STATUS_OPTIONS.map((value) => (
                  <MenuItem key={value} value={value}>
                    {t(`orders.status.${value.toLowerCase()}`)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogActions>
      </Dialog>
    </Stack>
  )
}



