import { useState } from 'react'
import { Container, TextField, Button, Typography } from '@mui/material'
import api from '../api/api'

export default function AddProduct() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/api/v1/catalog/products', {
        name,
        description,
        price: parseFloat(price),
      })
      setName('')
      setDescription('')
      setPrice('')
      alert('Product created!')
    } catch (err) {
      console.error(err)
      alert('Failed to create product')
    }
  }

  return (
    <Container>
      <Typography variant="h4" gutterBottom>Add Product</Typography>
      <form onSubmit={handleSubmit}>
        <TextField label="Name" fullWidth margin="normal" value={name} onChange={e => setName(e.target.value)} />
        <TextField label="Description" fullWidth margin="normal" value={description} onChange={e => setDescription(e.target.value)} />
        <TextField label="Price" fullWidth margin="normal" value={price} onChange={e => setPrice(e.target.value)} />
        <Button variant="contained" type="submit">Add</Button>
      </form>
    </Container>
  )
}
