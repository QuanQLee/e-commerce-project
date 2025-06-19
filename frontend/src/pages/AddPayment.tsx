import { useState } from 'react'
import { Container, TextField, Button, Typography } from '@mui/material'
import api from '../api/api'

export default function AddPayment() {
  const [orderId, setOrderId] = useState('')
  const [amount, setAmount] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/api/v1/payment/v1/payment', {
        order_id: orderId,
        amount: parseFloat(amount),
      })
      setOrderId('')
      setAmount('')
      alert('Payment sent!')
    } catch (err) {
      console.error(err)
      alert('Failed to process payment')
    }
  }

  return (
    <Container>
      <Typography variant="h4" gutterBottom>Send Payment</Typography>
      <form onSubmit={handleSubmit}>
        <TextField label="Order ID" fullWidth margin="normal" value={orderId} onChange={e => setOrderId(e.target.value)} />
        <TextField label="Amount" fullWidth margin="normal" value={amount} onChange={e => setAmount(e.target.value)} />
        <Button variant="contained" type="submit">Send</Button>
      </form>
    </Container>
  )
}
