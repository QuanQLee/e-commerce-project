import { useState } from 'react'
import { Container, TextField, Button, Typography, Card, CardContent } from '@mui/material'
import api from '../api/api'

interface Review {
  product_id: string
  user_id: string
  rating: number
  comment: string
}

export default function ReviewList() {
  const [productId, setProductId] = useState('')
  const [reviews, setReviews] = useState<Review[]>([])

  const handleFetch = async () => {
    try {
      const res = await api.get(`/api/v1/review/reviews/${productId}`)
      setReviews(res.data)
    } catch (err) {
      console.error(err)
      alert('Failed to fetch reviews')
    }
  }

  return (
    <Container>
      <Typography variant="h4" gutterBottom>Reviews</Typography>
      <TextField label="Product ID" fullWidth margin="normal" value={productId} onChange={e => setProductId(e.target.value)} />
      <Button variant="contained" onClick={handleFetch} sx={{ mb: 2 }}>Load</Button>
      {reviews.map((r, idx) => (
        <Card key={idx} sx={{ mb: 2 }}>
          <CardContent>
            <Typography>Product: {r.product_id}</Typography>
            <Typography>User: {r.user_id}</Typography>
            <Typography>Rating: {r.rating}</Typography>
            <Typography>{r.comment}</Typography>
          </CardContent>
        </Card>
      ))}
    </Container>
  )
}
