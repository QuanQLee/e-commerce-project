import { useState } from 'react'
import { Container, TextField, Button, Stack } from '@mui/material'
import api from '../api/api'
import PageHeader from '../components/PageHeader'
import { useSnackbar } from '../providers/SnackbarProvider'

export default function AddReview() {
  const [productId, setProductId] = useState('')
  const [userId, setUserId] = useState('')
  const [rating, setRating] = useState('')
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const { success, error } = useSnackbar()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const ratingNum = parseInt(rating, 10)
      if (!productId.trim() || !userId.trim()) { error('Product ID and User ID are required'); return }
      if (Number.isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) { error('Rating must be 1-5'); return }
      setLoading(true)
      await api.post('/api/v1/review/reviews', {
        product_id: productId,
        user_id: userId,
        rating: ratingNum,
        comment,
      })
      setProductId('')
      setUserId('')
      setRating('')
      setComment('')
      success('Review submitted')
    } catch (err) {
      console.error(err)
      error('Failed to submit review')
    }
    finally { setLoading(false) }
  }

  return (
    <Container>
      <PageHeader title="Add Review" />
      <form onSubmit={handleSubmit}>
        <TextField label="Product ID" fullWidth margin="normal" value={productId} onChange={e => setProductId(e.target.value)} />
        <TextField label="User ID" fullWidth margin="normal" value={userId} onChange={e => setUserId(e.target.value)} />
        <TextField label="Rating" fullWidth margin="normal" value={rating} onChange={e => setRating(e.target.value)} />
        <TextField label="Comment" fullWidth margin="normal" value={comment} onChange={e => setComment(e.target.value)} />
        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
          <Button variant="contained" type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit'}</Button>
          <Button variant="outlined" type="button" onClick={() => { setProductId(''); setUserId(''); setRating(''); setComment('') }}>Reset</Button>
        </Stack>
      </form>
    </Container>
  )
}
