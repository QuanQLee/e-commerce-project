import { useState } from 'react'
import { Container, TextField, Button, Typography } from '@mui/material'
import api from '../api/api'

export default function AddReview() {
  const [productId, setProductId] = useState('')
  const [userId, setUserId] = useState('')
  const [rating, setRating] = useState('')
  const [comment, setComment] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/api/v1/review/reviews', {
        product_id: productId,
        user_id: userId,
        rating: parseInt(rating, 10),
        comment,
      })
      setProductId('')
      setUserId('')
      setRating('')
      setComment('')
      alert('Review submitted!')
    } catch (err) {
      console.error(err)
      alert('Failed to submit review')
    }
  }

  return (
    <Container>
      <Typography variant="h4" gutterBottom>Add Review</Typography>
      <form onSubmit={handleSubmit}>
        <TextField label="Product ID" fullWidth margin="normal" value={productId} onChange={e => setProductId(e.target.value)} />
        <TextField label="User ID" fullWidth margin="normal" value={userId} onChange={e => setUserId(e.target.value)} />
        <TextField label="Rating" fullWidth margin="normal" value={rating} onChange={e => setRating(e.target.value)} />
        <TextField label="Comment" fullWidth margin="normal" value={comment} onChange={e => setComment(e.target.value)} />
        <Button variant="contained" type="submit">Submit</Button>
      </form>
    </Container>
  )
}
