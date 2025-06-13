import { useState } from 'react'
import { Container, TextField, Button, Typography } from '@mui/material'
import api from '../api/api'

export default function AddUser() {
  const [userName, setUserName] = useState('')
  const [email, setEmail] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/api/v1/user/users', { userName, email })
      setUserName('')
      setEmail('')
      alert('User created!')
    } catch (err) {
      console.error(err)
      alert('Failed to create user')
    }
  }

  return (
    <Container>
      <Typography variant="h4" gutterBottom>Add User</Typography>
      <form onSubmit={handleSubmit}>
        <TextField label="User Name" fullWidth margin="normal" value={userName} onChange={e => setUserName(e.target.value)} />
        <TextField label="Email" fullWidth margin="normal" value={email} onChange={e => setEmail(e.target.value)} />
        <Button variant="contained" type="submit">Add</Button>
      </form>
    </Container>
  )
}
