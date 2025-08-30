import { useEffect, useState } from 'react'
import { Container, Typography, Card, CardContent, CardMedia, CardActions, Button, Box } from '@mui/material'
import api from '../api/api'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'

interface Product {
  id: string
  name: string
  description: string
  price: number
  imageUrl?: string
  category: string
  stock: number
}

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get('/api/v1/catalog/products')
      .then(res => setProducts(res.data))
      .catch(err => {
        console.error(err)
        setError('Failed to load products')
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <Container>
      <Typography variant="h4" gutterBottom>Products</Typography>
      {loading && <Loading lines={4} />}
      {error && <ErrorState message={error} />}
      {!loading && !error && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
          {products.map((p) => (
            <Card key={p.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {p.imageUrl && (
                <CardMedia component="img" height="160" image={p.imageUrl} alt={p.name} sx={{ objectFit: 'cover' }} />
              )}
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6">{p.name}</Typography>
                <Typography color="text.secondary" sx={{ mb: 1 }}>{p.category}</Typography>
                <Typography variant="body2" sx={{ minHeight: 40 }}>
                  {p.description}
                </Typography>
                <Typography sx={{ mt: 1, fontWeight: 700 }}>${p.price}</Typography>
                <Typography variant="caption" color={p.stock > 0 ? 'success.main' : 'error.main'}>
                  Stock: {p.stock}
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small">View</Button>
                <Button size="small" color="secondary">Edit</Button>
              </CardActions>
            </Card>
          ))}
        </Box>
      )}
    </Container>
  )
}
