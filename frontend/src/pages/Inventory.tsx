import { useState } from 'react'
import { Container, TextField, Button, Typography, Stack } from '@mui/material'
import api from '../api/api'
import PageHeader from '../components/PageHeader'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'
import { useSnackbar } from '../providers/SnackbarProvider'

export default function Inventory() {
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [stock, setStock] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { success, error: toastError } = useSnackbar()

  const getStock = async () => {
    try {
      setError(null)
      if (!productId.trim()) { toastError('Product ID is required'); return }
      setLoading(true)
      const res = await api.get(`/api/v1/inventory/${productId}`)
      setStock(JSON.stringify(res.data, null, 2))
    } catch (err) {
      console.error(err)
      setError('Failed to fetch stock')
    }
    finally { setLoading(false) }
  }

  const reserve = async () => {
    try {
      setError(null)
      if (!productId.trim()) { toastError('Product ID is required'); return }
      const qty = parseInt(quantity, 10)
      if (Number.isNaN(qty) || qty <= 0) { toastError('Quantity must be a positive integer'); return }
      setLoading(true)
      await api.post('/api/v1/inventory/reserve', {
        product_id: productId,
        quantity: qty,
      })
      success('Reserved')
    } catch (err) {
      console.error(err)
      setError('Failed to reserve stock')
    }
    finally { setLoading(false) }
  }

  const release = async () => {
    try {
      setError(null)
      if (!productId.trim()) { toastError('Product ID is required'); return }
      const qty = parseInt(quantity, 10)
      if (Number.isNaN(qty) || qty <= 0) { toastError('Quantity must be a positive integer'); return }
      setLoading(true)
      await api.post('/api/v1/inventory/release', {
        product_id: productId,
        quantity: qty,
      })
      success('Released')
    } catch (err) {
      console.error(err)
      setError('Failed to release stock')
    }
    finally { setLoading(false) }
  }

  return (
    <Container>
      <PageHeader title="Inventory" />
      <TextField label="Product ID" fullWidth margin="normal" value={productId} onChange={e => setProductId(e.target.value)} />
      <TextField label="Quantity" fullWidth margin="normal" value={quantity} onChange={e => setQuantity(e.target.value)} />
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Button variant="contained" onClick={getStock} disabled={loading}>Get Stock</Button>
        <Button variant="contained" onClick={reserve} disabled={loading}>Reserve</Button>
        <Button variant="contained" onClick={release} disabled={loading}>Release</Button>
      </Stack>
      {loading && <Loading lines={2} />}
      {error && <ErrorState message={error} />}
      {stock && (
        <Typography component="pre" sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, overflowX: 'auto' }}>{stock}</Typography>
      )}
    </Container>
  )
}
