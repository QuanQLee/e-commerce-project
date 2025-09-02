import { Container, Card, CardContent, Typography } from '@mui/material'
import Grid from '@mui/material/Grid'

export default function Products() {
  const mock = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, name: `Product ${i + 1}`, price: 99 }))
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>Products</Typography>
      <Grid container spacing={2}>
        {mock.map(p => (
          <Grid key={p.id} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card><CardContent>
              <Typography>{p.name}</Typography>
              <Typography color="text.secondary">${p.price}</Typography>
            </CardContent></Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  )
}
