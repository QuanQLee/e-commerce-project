import { useEffect, useState } from 'react'
import { Container, TextField, Button, Typography, MenuItem } from '@mui/material'
import api from '../api/api'

export default function Login() {
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [grantType, setGrantType] = useState('client_credentials')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (clientId === '1' || clientId === '2') {
      setGrantType('password')
    }
  }, [clientId])

  const handleGrantTypeChange = (value: string) => {
    setGrantType(value)
    if (value === 'password') {
      // use sample client credentials automatically
      setClientId('1')
      setClientSecret('secret1')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const params = new URLSearchParams()
      params.append('grant_type', grantType)
      params.append('client_id', clientId)
      params.append('client_secret', clientSecret)
      // IdentityServer requires at least one scope when requesting a token
      params.append('scope', 'api1')
      if (grantType === 'password') {
        params.append('username', username)
        params.append('password', password)
      }
      await api.post('/api/v1/auth/connect/token', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
      setClientId('')
      setClientSecret('')
      setUsername('')
      setPassword('')
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
        <TextField label="Grant Type" select fullWidth margin="normal" value={grantType} onChange={e => handleGrantTypeChange(e.target.value)}>
          <MenuItem value="client_credentials">client_credentials</MenuItem>
          <MenuItem value="password">password</MenuItem>
        </TextField>
        {grantType === 'client_credentials' && (
          <>
            <TextField label="Client ID" fullWidth margin="normal" value={clientId} onChange={e => setClientId(e.target.value)} />
            <TextField label="Client Secret" type="password" fullWidth margin="normal" value={clientSecret} onChange={e => setClientSecret(e.target.value)} />
          </>
        )}
        {grantType === 'password' && (
          <>
            <TextField label="Username" fullWidth margin="normal" value={username} onChange={e => setUsername(e.target.value)} />
            <TextField label="Password" type="password" fullWidth margin="normal" value={password} onChange={e => setPassword(e.target.value)} />
          </>
        )}
        <Button variant="contained" type="submit">Login</Button>
      </form>
    </Container>
  )
}
