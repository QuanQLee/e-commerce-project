import { useEffect, useState } from 'react'
import { Container, Typography, Card, CardContent } from '@mui/material'
import api from '../api/api'

interface User {
  id: string
  userName: string
  email: string
}

export default function UserList() {
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    api.get('/api/v1/user/users')
      .then(res => setUsers(res.data))
      .catch(err => console.error(err))
  }, [])

  return (
    <Container>
      <Typography variant="h4" gutterBottom>Users</Typography>
      {users.map(u => (
        <Card key={u.id} sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6">{u.userName}</Typography>
            <Typography>{u.email}</Typography>
          </CardContent>
        </Card>
      ))}
    </Container>
  )
}
