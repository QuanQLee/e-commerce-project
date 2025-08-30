import { Stack, Typography, Box } from '@mui/material'

export default function PageHeader({ title, actions }: { title: string; actions?: React.ReactNode }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>{title}</Typography>
      <Box>{actions}</Box>
    </Stack>
  )
}

