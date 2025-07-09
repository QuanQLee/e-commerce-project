import { useState } from 'react'
import { Container, TextField, Button, Typography } from '@mui/material'
import api from '../api/api'

export default function Inventory() {
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [stock, setStock] = useState<string | null>(null)

  const getStock = async () => {
    try {
      const res = await api.get(`/api/v1/inventory/${productId}`)
      setStock(JSON.stringify(res.data))
    } catch (err) {
      console.error(err)
      alert('Failed to fetch stock')
    }
  }

  const reserve = async () => {
    try {
      await api.post('/api/v1/inventory/reserve', {
        product_id: productId,
        quantity: parseInt(quantity, 10),
      })
      alert('Reserved!')
    } catch (err) {
      console.error(err)
      alert('Failed to reserve stock')
    }
  }

  const release = async () => {
    try {
      await api.post('/api/v1/inventory/release', {
        product_id: productId,
        quantity: parseInt(quantity, 10),
      })
      alert('Released!')
    } catch (err) {
      console.error(err)
      alert('Failed to release stock')
    }
  }

  return (
    <Container>
      <Typography variant="h4" gutterBottom>Inventory</Typography>
      <TextField label="Product ID" fullWidth margin="normal" value={productId} onChange={e => setProductId(e.target.value)} />
      <TextField label="Quantity" fullWidth margin="normal" value={quantity} onChange={e => setQuantity(e.target.value)} />
      <Button variant="contained" onClick={getStock} sx={{ mr: 1 }}>Get Stock</Button>
      <Button variant="contained" onClick={reserve} sx={{ mr: 1 }}>Reserve</Button>
      <Button variant="contained" onClick={release}>Release</Button>
      {stock && (
        <Typography sx={{ mt: 2 }}><pre>{stock}</pre></Typography>
      )}
    </Container>
  )
}
