import { useState } from 'react'
import { Container, TextField, Button, Typography } from '@mui/material'
import api from '../api/api'

export default function AddOrder() {
  const [productName, setProductName] = useState('')
  const [price, setPrice] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/api/v1/order/orders', {
        items: [{ productName, price: parseFloat(price) }],
      })
      setProductName('')
      setPrice('')
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
        <TextField label="Product Name" fullWidth margin="normal" value={productName} onChange={e => setProductName(e.target.value)} />
        <TextField label="Price" fullWidth margin="normal" value={price} onChange={e => setPrice(e.target.value)} />
        <Button variant="contained" type="submit">Add</Button>
      </form>
    </Container>
  )
}
