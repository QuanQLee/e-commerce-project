import { useEffect, useState } from 'react'
import { Container, Typography } from '@mui/material'
import api from '../api/api'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'
import PageHeader from '../components/PageHeader'

export default function Metrics() {
  const [metrics, setMetrics] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get('/api/v1/analytics/metrics')
      .then(res => setMetrics(res.data))
      .catch(err => { console.error(err); setError('Failed to load metrics') })
      .finally(() => setLoading(false))
  }, [])

  return (
    <Container>
      <PageHeader title="Metrics" />
      {loading && <Loading lines={2} />}
      {error && <ErrorState message={error} />}
      {!loading && !error && (
        <Typography component="pre" sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, overflowX: 'auto' }}>
          {JSON.stringify(metrics, null, 2)}
        </Typography>
      )}
    </Container>
  )
}
