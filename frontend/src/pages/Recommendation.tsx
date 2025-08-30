import { useState } from 'react'
import { Container, TextField, Button, List, ListItem, Stack } from '@mui/material'
import api from '../api/api'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import { useSnackbar } from '../providers/SnackbarProvider'

export default function Recommendation() {
  const [productId, setProductId] = useState('')
  const [items, setItems] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { error: toastError } = useSnackbar()

  const handleFetch = async () => {
    try {
      setError(null)
      if (!productId.trim()) { toastError('Product ID is required'); return }
      setLoading(true)
      const res = await api.get(`/api/v1/recommendation/recommendations/${productId}`)
      setItems(res.data ?? [])
    } catch (err) {
      console.error(err)
      setError('Failed to fetch recommendations')
    }
    finally { setLoading(false) }
  }

  return (
    <Container>
      <PageHeader title="Recommendations" />
      <TextField label="Product ID" fullWidth margin="normal" value={productId} onChange={e => setProductId(e.target.value)} />
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Button variant="contained" onClick={handleFetch} disabled={loading}>{loading ? 'Loading...' : 'Get'}</Button>
        <Button variant="outlined" onClick={() => setItems([])}>Clear</Button>
      </Stack>
      {loading && <Loading lines={2} />}
      {error && <ErrorState message={error} />}
      {!loading && !error && items.length === 0 && <EmptyState message="No recommendations" />}
      {!loading && !error && (
        <List>
          {items.map((it, idx) => (
            <ListItem key={idx}>{it}</ListItem>
          ))}
        </List>
      )}
    </Container>
  )
}
