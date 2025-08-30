import { useEffect, useState } from 'react'
import { Container, Card, CardContent, Chip, Stack } from '@mui/material'
import api from '../api/api'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'

interface Shipment {
  id: string
  status: string
}

export default function ShipmentList() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get('/api/v1/shipping/shipments')
      .then(res => setShipments(res.data))
      .catch(err => { console.error(err); setError('Failed to load shipments') })
      .finally(() => setLoading(false))
  }, [])

  return (
    <Container>
      <PageHeader title="Shipments" />
      {loading && <Loading lines={3} />}
      {error && <ErrorState message={error} />}
      {!loading && !error && shipments.length === 0 && <EmptyState message="No shipments found" />}
      {!loading && !error && shipments.map(s => (
        <Card key={s.id} sx={{ mb: 2 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <strong>Shipment #{s.id}</strong>
              <Chip label={s.status} size="small" />
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Container>
  )
}
