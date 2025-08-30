import { useEffect, useState } from 'react'
import { Container, Card, CardContent } from '@mui/material'
import api from '../api/api'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'

interface PaymentItem {
  payment_id: string
  amount: number
  status: string
}

export default function PaymentList() {
  const [payments, setPayments] = useState<PaymentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get('/api/v1/payment/v1/payment')
      .then(res => setPayments(res.data?.payments ?? []))
      .catch(err => { console.error(err); setError('Failed to load payments') })
      .finally(() => setLoading(false))
  }, [])

  return (
    <Container>
      <PageHeader title="Payments" />
      {loading && <Loading lines={3} />}
      {error && <ErrorState message={error} />}
      {!loading && !error && payments.length === 0 && <EmptyState message="No payments found" />}
      {!loading && !error && payments.map(p => (
        <Card key={p.payment_id} sx={{ mb: 2 }}>
          <CardContent>
            <strong>Payment #{p.payment_id}</strong>
            <div>${p.amount} - {p.status}</div>
          </CardContent>
        </Card>
      ))}
    </Container>
  )
}
