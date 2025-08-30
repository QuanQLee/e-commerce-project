import { useState } from 'react'
import { Container, TextField, Button, Typography, Stack } from '@mui/material'
import api from '../api/api'
import { useSnackbar } from '../providers/SnackbarProvider'

export default function AddProduct() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [category, setCategory] = useState('')
  const [stock, setStock] = useState('0')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const { success, error } = useSnackbar()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // basic validation
      const errs: Record<string, string> = {}
      if (!name.trim()) errs.name = 'Name is required'
      const priceNum = Number(price)
      if (!price || Number.isNaN(priceNum) || priceNum < 0) errs.price = 'Price must be a non-negative number'
      const stockNum = parseInt(stock, 10)
      if (Number.isNaN(stockNum) || stockNum < 0) errs.stock = 'Stock must be a non-negative integer'
      if (imageUrl.trim()) {
        try { new URL(imageUrl) } catch { errs.imageUrl = 'Invalid URL' }
      }
      setErrors(errs)
      if (Object.keys(errs).length) return

      setLoading(true)
      await api.post('/api/v1/catalog/products', {
        name,
        description,
        price: priceNum,
        imageUrl,
        category,
        stock: stockNum,
      })
      setName('')
      setDescription('')
      setPrice('')
      setImageUrl('')
      setCategory('')
      setStock('0')
      success('Product created')
    } catch (err) {
      console.error(err)
      error('Failed to create product')
    }
    finally { setLoading(false) }
  }

  return (
    <Container>
      <Typography variant="h4" gutterBottom>Add Product</Typography>
      <form onSubmit={handleSubmit} noValidate>
        <TextField label="Name" fullWidth margin="normal" value={name} onChange={e => setName(e.target.value)} error={!!errors.name} helperText={errors.name} />
        <TextField label="Description" fullWidth margin="normal" value={description} onChange={e => setDescription(e.target.value)} />
        <TextField label="Price" fullWidth margin="normal" value={price} onChange={e => setPrice(e.target.value)} error={!!errors.price} helperText={errors.price} />
        <TextField label="Image URL" fullWidth margin="normal" value={imageUrl} onChange={e => setImageUrl(e.target.value)} error={!!errors.imageUrl} helperText={errors.imageUrl} />
        <TextField label="Category" fullWidth margin="normal" value={category} onChange={e => setCategory(e.target.value)} />
        <TextField label="Stock" fullWidth margin="normal" value={stock} onChange={e => setStock(e.target.value)} error={!!errors.stock} helperText={errors.stock} />
        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
          <Button variant="contained" type="submit" disabled={loading}>{loading ? 'Adding...' : 'Add'}</Button>
          <Button variant="outlined" type="button" onClick={() => { setName(''); setDescription(''); setPrice(''); setImageUrl(''); setCategory(''); setStock('0'); setErrors({}) }}>Reset</Button>
        </Stack>
      </form>
    </Container>
  )
}
