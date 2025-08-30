import { useEffect, useState } from 'react'
import { Container, Card, CardContent } from '@mui/material'
import api from '../api/api'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'

interface Coupon {
  code: string
  discount: number
}

export default function CouponList() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get('/api/v1/promotion/coupons')
      .then(res => setCoupons(res.data))
      .catch(err => { console.error(err); setError('Failed to load coupons') })
      .finally(() => setLoading(false))
  }, [])

  return (
    <Container>
      <PageHeader title="Coupons" />
      {loading && <Loading lines={3} />}
      {error && <ErrorState message={error} />}
      {!loading && !error && coupons.length === 0 && <EmptyState message="No coupons found" />}
      {!loading && !error && coupons.map(c => (
        <Card key={c.code} sx={{ mb: 2 }}>
          <CardContent>
            <strong>{c.code}</strong>
            <div>Discount: {c.discount}</div>
          </CardContent>
        </Card>
      ))}
    </Container>
  )
}
