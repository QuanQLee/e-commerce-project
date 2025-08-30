import { useState } from 'react'
import { Container, TextField, Button, Stack } from '@mui/material'
import api from '../api/api'
import PageHeader from '../components/PageHeader'
import { useSnackbar } from '../providers/SnackbarProvider'

export default function AddUser() {
  const [userName, setUserName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const { success, error } = useSnackbar()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (!userName.trim() || !email.trim()) { error('User name and email are required'); return }
      setLoading(true)
      await api.post('/api/v1/user/users', { userName, email })
      setUserName('')
      setEmail('')
      success('User created')
    } catch (err) {
      console.error(err)
      error('Failed to create user')
    }
    finally { setLoading(false) }
  }

  return (
    <Container>
      <PageHeader title="Add User" />
      <form onSubmit={handleSubmit}>
        <TextField label="User Name" fullWidth margin="normal" value={userName} onChange={e => setUserName(e.target.value)} />
        <TextField label="Email" fullWidth margin="normal" value={email} onChange={e => setEmail(e.target.value)} />
        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
          <Button variant="contained" type="submit" disabled={loading}>{loading ? 'Adding...' : 'Add'}</Button>
          <Button variant="outlined" type="button" onClick={() => { setUserName(''); setEmail('') }}>Reset</Button>
        </Stack>
      </form>
    </Container>
  )
}
