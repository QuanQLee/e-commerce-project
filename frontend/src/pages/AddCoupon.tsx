import { useState } from 'react'
import { Container, TextField, Button, Typography } from '@mui/material'
import api from '../api/api'

export default function AddCoupon() {
  const [code, setCode] = useState('')
  const [discount, setDiscount] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/api/v1/promotion/coupons', {
        code,
        discount: parseFloat(discount),
      })
      setCode('')
      setDiscount('')
      alert('Coupon created!')
    } catch (err) {
      console.error(err)
      alert('Failed to create coupon')
    }
  }

  return (
    <Container>
      <Typography variant="h4" gutterBottom>Add Coupon</Typography>
      <form onSubmit={handleSubmit}>
        <TextField label="Code" fullWidth margin="normal" value={code} onChange={e => setCode(e.target.value)} />
        <TextField label="Discount" fullWidth margin="normal" value={discount} onChange={e => setDiscount(e.target.value)} />
        <Button variant="contained" type="submit">Add</Button>
      </form>
    </Container>
  )
}
