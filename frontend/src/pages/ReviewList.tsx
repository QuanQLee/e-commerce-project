import { useState } from 'react'
import { Container, TextField, Button, Typography, Card, CardContent, Stack } from '@mui/material'
import api from '../api/api'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import { useSnackbar } from '../providers/SnackbarProvider'

interface Review {
  product_id: string
  user_id: string
  rating: number
  comment: string
}

export default function ReviewList() {
  const [productId, setProductId] = useState('')
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { error: toastError, success } = useSnackbar()

  const handleFetch = async () => {
    try {
      setError(null)
      if (!productId.trim()) { toastError('Product ID is required'); return }
      setLoading(true)
      const res = await api.get(`/api/v1/review/reviews/${productId}`)
      setReviews(res.data)
      if (res.data?.length === 0) success('No reviews for this product')
    } catch (err) {
      console.error(err)
      setError('Failed to fetch reviews')
    }
    finally { setLoading(false) }
  }

  return (
    <Container>
      <PageHeader title="Reviews" />
      <TextField label="Product ID" fullWidth margin="normal" value={productId} onChange={e => setProductId(e.target.value)} />
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Button variant="contained" onClick={handleFetch} disabled={loading}>{loading ? 'Loading...' : 'Load'}</Button>
        <Button variant="outlined" onClick={() => setReviews([])}>Clear</Button>
      </Stack>
      {loading && <Loading lines={2} />}
      {error && <ErrorState message={error} />}
      {!loading && !error && reviews.length === 0 && <EmptyState message="No reviews to show" />}
      {!loading && !error && reviews.map((r, idx) => (
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
