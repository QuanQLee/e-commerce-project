import { Card, CardContent, Typography, Box } from '@mui/material'
import { useI18n } from '../state/i18n'

const cardKeys: Array<'sales' | 'orders' | 'products' | 'coupons'> = ['sales', 'orders', 'products', 'coupons']

export default function Dashboard() {
  const { t } = useI18n()

  return (
    <Box
      display="grid"
      gap={2}
      gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }}
    >
      {cardKeys.map((key) => (
        <Card key={key}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">
              {t(`dashboard.cards.${key}`)}
            </Typography>
            <Typography variant="h5" sx={{ mt: 1 }}>
              {t('dashboard.placeholder')}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  )
}
