import { useState } from 'react'
import { Container, TextField, Button, Stack } from '@mui/material'
import api from '../api/api'
import PageHeader from '../components/PageHeader'
import { useSnackbar } from '../providers/SnackbarProvider'

export default function AddOrder() {
  const [productName, setProductName] = useState('')
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const { success, error } = useSnackbar()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const priceNum = Number(price)
      if (!productName.trim()) { error('Product name is required'); return }
      if (!price || Number.isNaN(priceNum) || priceNum < 0) { error('Price must be a non-negative number'); return }
      setLoading(true)
      await api.post('/api/v1/order/orders', {
        items: [{ productName, price: parseFloat(price) }],
      })
      setProductName('')
      setPrice('')
      success('Order created')
    } catch (err) {
      console.error(err)
      error('Failed to create order')
    }
    finally { setLoading(false) }
  }

  return (
    <Container>
      <PageHeader title="Add Order" />
      <form onSubmit={handleSubmit}>
        <TextField label="Product Name" fullWidth margin="normal" value={productName} onChange={e => setProductName(e.target.value)} />
        <TextField label="Price" fullWidth margin="normal" value={price} onChange={e => setPrice(e.target.value)} />
        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
          <Button variant="contained" type="submit" disabled={loading}>{loading ? 'Adding...' : 'Add'}</Button>
          <Button variant="outlined" type="button" onClick={() => { setProductName(''); setPrice('') }}>Reset</Button>
        </Stack>
      </form>
    </Container>
  )
}
