import { useEffect, useState } from 'react'
import { Container, Typography } from '@mui/material'
import api from '../api/api'

export default function Metrics() {
  const [metrics, setMetrics] = useState<Record<string, number>>({})

  useEffect(() => {
    api.get('/api/v1/analytics/metrics')
      .then(res => setMetrics(res.data))
      .catch(err => console.error(err))
  }, [])

  return (
    <Container>
      <Typography variant="h4" gutterBottom>Metrics</Typography>
      <pre>{JSON.stringify(metrics, null, 2)}</pre>
    </Container>
  )
}
