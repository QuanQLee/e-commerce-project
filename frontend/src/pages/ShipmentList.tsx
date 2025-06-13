import { useEffect, useState } from 'react'
import { Container, Typography, Card, CardContent } from '@mui/material'
import api from '../api/api'

interface Shipment {
  id: string
  status: string
}

export default function ShipmentList() {
  const [shipments, setShipments] = useState<Shipment[]>([])

  useEffect(() => {
    api.get('/api/v1/shipping/shipments')
      .then(res => setShipments(res.data))
      .catch(err => console.error(err))
  }, [])

  return (
    <Container>
      <Typography variant="h4" gutterBottom>Shipments</Typography>
      {shipments.map(s => (
        <Card key={s.id} sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6">Shipment #{s.id}</Typography>
            <Typography>{s.status}</Typography>
          </CardContent>
        </Card>
      ))}
    </Container>
  )
}
