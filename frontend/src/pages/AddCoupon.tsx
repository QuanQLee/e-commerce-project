import { useState } from 'react'
import { Container, TextField, Button, Stack } from '@mui/material'
import api from '../api/api'
import PageHeader from '../components/PageHeader'
import { useSnackbar } from '../providers/SnackbarProvider'

export default function AddCoupon() {
  const [code, setCode] = useState('')
  const [discount, setDiscount] = useState('')
  const [loading, setLoading] = useState(false)
  const { success, error } = useSnackbar()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const discountNum = Number(discount)
      if (!code.trim()) { error('Code is required'); return }
      if (!discount || Number.isNaN(discountNum) || discountNum <= 0) { error('Discount must be a positive number'); return }
      setLoading(true)
      await api.post('/api/v1/promotion/coupons', {
        code,
        discount: discountNum,
      })
      setCode('')
      setDiscount('')
      success('Coupon created')
    } catch (err) {
      console.error(err)
      error('Failed to create coupon')
    }
    finally { setLoading(false) }
  }

  return (
    <Container>
      <PageHeader title="Add Coupon" />
      <form onSubmit={handleSubmit}>
        <TextField label="Code" fullWidth margin="normal" value={code} onChange={e => setCode(e.target.value)} />
        <TextField label="Discount" fullWidth margin="normal" value={discount} onChange={e => setDiscount(e.target.value)} />
        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
          <Button variant="contained" type="submit" disabled={loading}>{loading ? 'Adding...' : 'Add'}</Button>
          <Button variant="outlined" type="button" onClick={() => { setCode(''); setDiscount('') }}>Reset</Button>
        </Stack>
      </form>
    </Container>
  )
}
