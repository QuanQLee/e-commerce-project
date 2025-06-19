import { useState } from 'react'
import { Container, TextField, Button, Typography } from '@mui/material'
import api from '../api/api'

export default function RiskCheck() {
  const [userId, setUserId] = useState('')
  const [action, setAction] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/api/v1/security/risk/order-check', { userId, action })
      alert('Risk check sent!')
      setUserId('')
      setAction('')
    } catch (err) {
      console.error(err)
      alert('Failed to check risk')
    }
  }

  return (
    <Container>
      <Typography variant="h4" gutterBottom>Order Risk Check</Typography>
      <form onSubmit={handleSubmit}>
        <TextField label="User ID" fullWidth margin="normal" value={userId} onChange={e => setUserId(e.target.value)} />
        <TextField label="Action" fullWidth margin="normal" value={action} onChange={e => setAction(e.target.value)} />
        <Button variant="contained" type="submit">Check</Button>
      </form>
    </Container>
  )
}
