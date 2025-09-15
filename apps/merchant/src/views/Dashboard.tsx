import { Card, CardContent, Typography, Box } from '@mui/material'

export default function Dashboard() {
  return (
    <Box
      display="grid"
      gap={2}
      gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }}
    >
      {["Sales", "Orders", "Products", "Coupons"].map((title) => (
        <Card key={title}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">{title}</Typography>
            <Typography variant="h5" sx={{ mt: 1 }}>—</Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  )
}

