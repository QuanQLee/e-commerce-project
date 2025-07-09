import { useEffect, useState } from 'react'
import { Container, Typography, Card, CardContent } from '@mui/material'
import api from '../api/api'

interface Coupon {
  code: string
  discount: number
}

export default function CouponList() {
  const [coupons, setCoupons] = useState<Coupon[]>([])

  useEffect(() => {
    api.get('/api/v1/promotion/coupons')
      .then(res => setCoupons(res.data))
      .catch(err => console.error(err))
  }, [])

  return (
    <Container>
      <Typography variant="h4" gutterBottom>Coupons</Typography>
      {coupons.map(c => (
        <Card key={c.code} sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6">{c.code}</Typography>
            <Typography>Discount: {c.discount}</Typography>
          </CardContent>
        </Card>
      ))}
    </Container>
  )
}
