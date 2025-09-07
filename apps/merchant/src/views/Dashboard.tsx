import { Card, CardContent, Typography, Grid } from '@mui/material'

export default function Dashboard() {
  return (
    <Grid container spacing={2}>
      {["Sales", "Orders", "Products", "Coupons"].map((title) => (
        <Grid key={title} item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">{title}</Typography>
              <Typography variant="h5" sx={{ mt: 1 }}>—</Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}

