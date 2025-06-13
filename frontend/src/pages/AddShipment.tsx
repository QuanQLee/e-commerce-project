import { useState } from 'react'
import { Container, TextField, Button, Typography } from '@mui/material'
import api from '../api/api'

export default function AddShipment() {
  const [orderId, setOrderId] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/api/v1/shipping/shipments', { orderId })
      setOrderId('')
      alert('Shipment created!')
    } catch (err) {
      console.error(err)
      alert('Failed to create shipment')
    }
  }

  return (
    <Container>
      <Typography variant="h4" gutterBottom>Add Shipment</Typography>
      <form onSubmit={handleSubmit}>
        <TextField label="Order ID" fullWidth margin="normal" value={orderId} onChange={e => setOrderId(e.target.value)} />
        <Button variant="contained" type="submit">Add</Button>
      </form>
    </Container>
  )
}
