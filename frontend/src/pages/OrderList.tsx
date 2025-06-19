import { useEffect, useState } from 'react'
import { Container, Typography, Card, CardContent } from '@mui/material'
import api from '../api/api'

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
            <Typography>Status: {o.status}</Typography>
            <Typography>Total: ${o.totalPrice}</Typography>
            {o.items.map((item, idx) => (
              <Typography key={idx}>- {item.productName}: ${item.price}</Typography>
            ))}
          </CardContent>
        </Card>
      ))}
    </Container>
  )
}
