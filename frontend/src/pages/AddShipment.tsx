import { useState } from 'react'
import { Container, TextField, Button, Stack } from '@mui/material'
import api from '../api/api'
import PageHeader from '../components/PageHeader'
import { useSnackbar } from '../providers/SnackbarProvider'

export default function AddShipment() {
  const [orderId, setOrderId] = useState('')
  const [loading, setLoading] = useState(false)
  const { success, error } = useSnackbar()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (!orderId.trim()) { error('Order ID is required'); return }
      setLoading(true)
      await api.post('/api/v1/shipping/shipments', { orderId })
      setOrderId('')
      success('Shipment created')
    } catch (err) {
      console.error(err)
      error('Failed to create shipment')
    }
    finally { setLoading(false) }
  }

  return (
    <Container>
      <PageHeader title="Add Shipment" />
      <form onSubmit={handleSubmit}>
        <TextField label="Order ID" fullWidth margin="normal" value={orderId} onChange={e => setOrderId(e.target.value)} />
        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
          <Button variant="contained" type="submit" disabled={loading}>{loading ? 'Adding...' : 'Add'}</Button>
          <Button variant="outlined" type="button" onClick={() => setOrderId('')}>Reset</Button>
        </Stack>
      </form>
    </Container>
  )
}
