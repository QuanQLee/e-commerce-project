import { useEffect, useState } from 'react'
import { Container, Typography, Card, CardContent } from '@mui/material'
import api from '../api/api'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'

interface User {
  id: string
  userName: string
  email: string
}

export default function UserList() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get('/api/v1/user/users')
      .then(res => setUsers(res.data))
      .catch(err => { console.error(err); setError('Failed to load users') })
      .finally(() => setLoading(false))
  }, [])

  return (
    <Container>
      <Typography variant="h4" gutterBottom>Users</Typography>
      {loading && <Loading lines={3} />}
      {error && <ErrorState message={error} />}
      {!loading && !error && users.map(u => (
        <Card key={u.id} sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6">{u.userName}</Typography>
            <Typography color="text.secondary">{u.email}</Typography>
          </CardContent>
        </Card>
      ))}
    </Container>
  )
}
