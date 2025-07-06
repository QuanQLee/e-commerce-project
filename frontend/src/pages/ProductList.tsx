import { useEffect, useState } from 'react'
import { Container, Typography, Card, CardContent } from '@mui/material'
import api from '../api/api'

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

  useEffect(() => {
    api.get('/api/v1/catalog/products')
      .then(res => setProducts(res.data))
      .catch(err => console.error(err))
  }, [])

  return (
    <Container>
      <Typography variant="h4" gutterBottom>Products</Typography>
      {products.map(p => (
        <Card key={p.id} sx={{ mb: 2 }}>
          <CardContent>
            {p.imageUrl && <img src={p.imageUrl} alt={p.name} style={{ maxWidth: '100%' }} />}
            <Typography variant="h6">{p.name}</Typography>
            <Typography>{p.description}</Typography>
            <Typography>Category: {p.category}</Typography>
            <Typography>${p.price}</Typography>
            <Typography>Stock: {p.stock}</Typography>
          </CardContent>
        </Card>
      ))}
    </Container>
  )
}
