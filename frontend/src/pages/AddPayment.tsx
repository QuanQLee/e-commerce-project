import { useState } from 'react'
import { Container, TextField, Button, Stack } from '@mui/material'
import api from '../api/api'
import PageHeader from '../components/PageHeader'
import { useSnackbar } from '../providers/SnackbarProvider'

export default function AddPayment() {
  const [orderId, setOrderId] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const { success, error } = useSnackbar()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const amountNum = Number(amount)
      if (!orderId.trim()) { error('Order ID is required'); return }
      if (!amount || Number.isNaN(amountNum) || amountNum <= 0) { error('Amount must be a positive number'); return }
      setLoading(true)
      await api.post('/api/v1/payment/v1/payment', {
        order_id: orderId,
        amount: amountNum,
      })
      setOrderId('')
      setAmount('')
      success('Payment sent')
    } catch (err) {
      console.error(err)
      error('Failed to process payment')
    }
    finally { setLoading(false) }
  }

  return (
    <Container>
      <PageHeader title="Send Payment" />
      <form onSubmit={handleSubmit}>
        <TextField label="Order ID" fullWidth margin="normal" value={orderId} onChange={e => setOrderId(e.target.value)} />
        <TextField label="Amount" fullWidth margin="normal" value={amount} onChange={e => setAmount(e.target.value)} />
        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
          <Button variant="contained" type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send'}</Button>
          <Button variant="outlined" type="button" onClick={() => { setOrderId(''); setAmount('') }}>Reset</Button>
        </Stack>
      </form>
    </Container>
  )
}
