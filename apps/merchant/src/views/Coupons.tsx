import { useEffect, useState } from 'react'
import { Card, CardContent, Typography, Stack } from '@mui/material'
import api from '../api'

interface Coupon { code: string; discount: number }

export default function Coupons() {
  const [items, setItems] = useState<Coupon[]>([])
  useEffect(() => {
    api.get('/api/v1/promotion/coupons').then(r => setItems(r.data)).catch(() => setItems([]))
  }, [])
  return (
    <Stack spacing={2}>
      {items.length === 0 && <Typography color="text.secondary">No coupons</Typography>}
      {items.map(c => (
        <Card key={c.code}><CardContent><b>{c.code}</b> — {c.discount}%</CardContent></Card>
      ))}
    </Stack>
  )
}

