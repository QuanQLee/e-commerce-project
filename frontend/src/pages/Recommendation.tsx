import { useState } from 'react'
import { Container, TextField, Button, Typography, List, ListItem } from '@mui/material'
import api from '../api/api'

export default function Recommendation() {
  const [productId, setProductId] = useState('')
  const [items, setItems] = useState<string[]>([])

  const handleFetch = async () => {
    try {
      const res = await api.get(`/api/v1/recommendation/recommendations/${productId}`)
      setItems(res.data)
    } catch (err) {
      console.error(err)
      alert('Failed to fetch recommendations')
    }
  }

  return (
    <Container>
      <Typography variant="h4" gutterBottom>Recommendations</Typography>
      <TextField label="Product ID" fullWidth margin="normal" value={productId} onChange={e => setProductId(e.target.value)} />
      <Button variant="contained" onClick={handleFetch} sx={{ mb: 2 }}>Get</Button>
      <List>
        {items.map((it, idx) => (
          <ListItem key={idx}>{it}</ListItem>
        ))}
      </List>
    </Container>
  )
}
