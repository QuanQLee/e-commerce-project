import { useEffect, useState } from 'react'
import { Card, CardContent, Typography, Stack, TextField, Button, Box, CircularProgress } from '@mui/material'
import api from '../api'

type Product = {
  id: string
  name: string
  description?: string
  price: number
  imageUrl?: string
  category?: string
  stock?: number
}

export default function Products() {
  const [keyword, setKeyword] = useState('')
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/v1/catalog/products')
      setItems(res.data || [])
    } catch (err: any) {
      if (err?.response?.status === 401) setError('需要登录后才能查看产品，请先登录')
      else setError(err?.response?.data?.message || err?.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const filtered = keyword
    ? items.filter(p => p.name.toLowerCase().includes(keyword.toLowerCase()))
    : items

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2}>
        <TextField size="small" label="Search" value={keyword} onChange={e => setKeyword(e.target.value)} />
        <Button variant="contained" onClick={fetchData} disabled={loading}>Refresh</Button>
        <Button variant="outlined">Add Product</Button>
      </Stack>

      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={20} />
          <Typography color="text.secondary">加载中...</Typography>
        </Box>
      )}

      {!loading && error && (
        <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'rgba(255,0,0,0.06)', border: '1px solid rgba(255,0,0,0.15)' }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      {!loading && !error && filtered.length === 0 && (
        <Card><CardContent><Typography>暂无产品</Typography></CardContent></Card>
      )}

      {!loading && !error && filtered.map(p => (
        <Card key={p.id}>
          <CardContent>
            <Typography variant="h6">{p.name}</Typography>
            <Typography color="text.secondary">{p.category}</Typography>
            <Typography>{p.description}</Typography>
            <Typography sx={{ fontWeight: 700, mt: 1 }}>${p.price}</Typography>
          </CardContent>
        </Card>
      ))}
    </Stack>
  )
}
