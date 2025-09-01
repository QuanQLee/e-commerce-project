import { useEffect, useState } from 'react'
import { Card, CardContent, Typography, Stack, TextField, Button } from '@mui/material'
// Placeholder for API usage; wire to /api/v1/catalog later
import api from '../api'

export default function Products() {
  const [keyword, setKeyword] = useState('')
  useEffect(() => { /* TODO: fetch product list */ }, [])
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2}>
        <TextField size="small" label="Search" value={keyword} onChange={e => setKeyword(e.target.value)} />
        <Button variant="contained">Search</Button>
        <Button variant="outlined">Add Product</Button>
      </Stack>
      <Card><CardContent><Typography>No products yet.</Typography></CardContent></Card>
    </Stack>
  )
}
