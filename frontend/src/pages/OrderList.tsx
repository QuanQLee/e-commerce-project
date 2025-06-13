import { useEffect, useState } from 'react'
import { Container, Typography, Card, CardContent } from '@mui/material'
import api from '../api/api'

interface Order {
  id: string
  userId: string
  total: number
}

export default function OrderList() {
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    api.get('/api/v1/order/orders')
      .then(res => setOrders(res.data))
      .catch(err => console.error(err))
  }, [])

  return (
    <Container>
      <Typography variant="h4" gutterBottom>Orders</Typography>
      {orders.map(o => (
        <Card key={o.id} sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6">Order #{o.id}</Typography>
            <Typography>User {o.userId}</Typography>
            <Typography>${o.total}</Typography>
          </CardContent>
        </Card>
      ))}
    </Container>
  )
}
