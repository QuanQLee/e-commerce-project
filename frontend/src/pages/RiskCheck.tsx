import { useState } from 'react'
import { Container, TextField, Button } from '@mui/material'
import api from '../api/api'
import PageHeader from '../components/PageHeader'
import { useSnackbar } from '../providers/SnackbarProvider'

export default function RiskCheck() {
  const [userId, setUserId] = useState('')
  const [action, setAction] = useState('')
  const [loading, setLoading] = useState(false)
  const { error, success } = useSnackbar()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (!userId.trim() || !action.trim()) { error('User ID and Action are required'); return }
      setLoading(true)
      await api.post('/api/v1/security/risk/order-check', { userId, action })
      success('Risk check sent')
      setUserId('')
      setAction('')
    } catch (err) {
      console.error(err)
      error('Failed to check risk')
    }
    finally { setLoading(false) }
  }

  return (
    <Container>
      <PageHeader title="Order Risk Check" />
      <form onSubmit={handleSubmit}>
        <TextField label="User ID" fullWidth margin="normal" value={userId} onChange={e => setUserId(e.target.value)} />
        <TextField label="Action" fullWidth margin="normal" value={action} onChange={e => setAction(e.target.value)} />
        <Button variant="contained" type="submit" disabled={loading}>{loading ? 'Checking...' : 'Check'}</Button>
      </form>
    </Container>
  )
}
