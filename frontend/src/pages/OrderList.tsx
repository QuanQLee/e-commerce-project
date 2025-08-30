import { useEffect, useState } from 'react'
import { Container, Typography, Card, CardContent, Stack, Chip } from '@mui/material'
import api from '../api/api'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'

interface OrderItem {
  productName: string
  price: number
}

interface Order {
  id: string
  items: OrderItem[]
  totalPrice: number
  status: string
}

export default function OrderList() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get('/api/v1/order/orders')
      .then(res => setOrders(res.data))
      .catch(err => { console.error(err); setError('Failed to load orders') })
      .finally(() => setLoading(false))
  }, [])

  return (
    <Container>
      <Typography variant="h4" gutterBottom>Orders</Typography>
      {loading && <Loading lines={3} />}
      {error && <ErrorState message={error} />}
      {!loading && !error && orders.map(o => (
        <Card key={o.id} sx={{ mb: 2 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Order #{o.id}</Typography>
              <Chip label={o.status} color={o.status === 'PAID' ? 'success' : 'default'} />
            </Stack>
            <Typography sx={{ mt: 1 }}>Total: ${o.totalPrice}</Typography>
            {o.items.map((item, idx) => (
              <Typography key={idx} variant="body2">• {item.productName}: ${item.price}</Typography>
            ))}
          </CardContent>
        </Card>
      ))}
    </Container>
  )
}
