import { Container, Typography } from '@mui/material'

export default function Account() {
  return (
    <Container sx={{ py: 5 }}>
      <Typography variant="h4" gutterBottom>Account</Typography>
      <Typography color="text.secondary">Please login from the Admin or Merchant portal to manage your account.</Typography>
    </Container>
  )
}

