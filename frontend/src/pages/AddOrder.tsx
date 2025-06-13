import { useState } from 'react'
import { Container, TextField, Button, Typography } from '@mui/material'
import api from '../api/api'

export default function AddOrder() {
  const [userId, setUserId] = useState('')
  const [total, setTotal] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/api/v1/order/orders', {
        userId,
        total: parseFloat(total),
      })
      setUserId('')
      setTotal('')
      alert('Order created!')
    } catch (err) {
      console.error(err)
      alert('Failed to create order')
    }
  }

  return (
    <Container>
      <Typography variant="h4" gutterBottom>Add Order</Typography>
      <form onSubmit={handleSubmit}>
        <TextField label="User ID" fullWidth margin="normal" value={userId} onChange={e => setUserId(e.target.value)} />
        <TextField label="Total" fullWidth margin="normal" value={total} onChange={e => setTotal(e.target.value)} />
        <Button variant="contained" type="submit">Add</Button>
      </form>
    </Container>
  )
}
