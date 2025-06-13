import { useState } from 'react'
import { Container, TextField, Button, Typography } from '@mui/material'
import api from '../api/api'

export default function RiskCheck() {
  const [orderId, setOrderId] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/api/v1/security/risk/order-check', { orderId })
      alert('Risk check sent!')
      setOrderId('')
    } catch (err) {
      console.error(err)
      alert('Failed to check risk')
    }
  }

  return (
    <Container>
      <Typography variant="h4" gutterBottom>Order Risk Check</Typography>
      <form onSubmit={handleSubmit}>
        <TextField label="Order ID" fullWidth margin="normal" value={orderId} onChange={e => setOrderId(e.target.value)} />
        <Button variant="contained" type="submit">Check</Button>
      </form>
    </Container>
  )
}
