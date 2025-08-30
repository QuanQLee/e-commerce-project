import { Alert } from '@mui/material'

export default function ErrorState({ message = 'Something went wrong.' }: { message?: string }) {
  return <Alert severity="error">{message}</Alert>
}

