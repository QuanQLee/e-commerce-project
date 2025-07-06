import { useState } from 'react'
import { Container, TextField, Button, Typography } from '@mui/material'
import api from '../api/api'

export default function AddProduct() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [category, setCategory] = useState('')
  const [stock, setStock] = useState('0')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/api/v1/catalog/products', {
        name,
        description,
        price: parseFloat(price),
        imageUrl,
        category,
        stock: parseInt(stock, 10),
      })
      setName('')
      setDescription('')
      setPrice('')
      setImageUrl('')
      setCategory('')
      setStock('0')
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
        <TextField label="Image URL" fullWidth margin="normal" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
        <TextField label="Category" fullWidth margin="normal" value={category} onChange={e => setCategory(e.target.value)} />
        <TextField label="Stock" fullWidth margin="normal" value={stock} onChange={e => setStock(e.target.value)} />
        <Button variant="contained" type="submit">Add</Button>
      </form>
    </Container>
  )
}
