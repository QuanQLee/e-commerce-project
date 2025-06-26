import { useState } from 'react'
import { Container, TextField, Button, Typography } from '@mui/material'
import api from '../api/api'

export default function Login() {
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const params = new URLSearchParams()
      params.append('grant_type', 'client_credentials')
      params.append('client_id', clientId)
      params.append('client_secret', clientSecret)
      await api.post('/api/v1/auth/connect/token', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
      setClientId('')
      setClientSecret('')
      alert('Logged in!')
    } catch (err) {
      console.error(err)
      alert('Failed to login')
    }
  }

  return (
    <Container>
      <Typography variant="h4" gutterBottom>Login</Typography>
      <form onSubmit={handleSubmit}>
        <TextField label="Client ID" fullWidth margin="normal" value={clientId} onChange={e => setClientId(e.target.value)} />
        <TextField label="Client Secret" type="password" fullWidth margin="normal" value={clientSecret} onChange={e => setClientSecret(e.target.value)} />
        <Button variant="contained" type="submit">Login</Button>
      </form>
    </Container>
  )
}
