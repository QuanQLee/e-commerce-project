import Link from 'next/link'
import { useMemo } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Stack,
  Typography
} from '@mui/material'
import { useI18n } from '../../state/i18n'
import { useCart } from '../../state/cart'

export default function AccountOverview() {
  const { t, language } = useI18n()
  const { items } = useCart()

  const quickStats = useMemo(
    () => [
      {
        key: 'cart',
        title: t('account.overview.cartItems'),
        value: items.reduce((sum, item) => sum + item.quantity, 0),
        action: t('account.overview.viewCart'),
        href: '/cart'
      },
      {
        key: 'orders',
        title: t('account.overview.orders'),
        value: t('account.overview.ordersHint'),
        action: t('account.overview.viewOrders'),
        href: '/account/orders'
      }
    ],
    [items, t]
  )

  return (
    <Container sx={{ py: 5 }}>
      <Stack spacing={4}>
        <Box>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            {t('account.header')}
          </Typography>
          <Typography color="text.secondary">{t('account.message')}</Typography>
        </Box>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          {quickStats.map((stat) => (
            <Card key={stat.key} sx={{ flex: 1 }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {stat.title}
                </Typography>
                <Typography variant="h5" sx={{ mt: 1 }}>
                  {stat.value}
                </Typography>
                <Button component={Link} href={stat.href} sx={{ mt: 2 }}>
                  {stat.action}
                </Button>
              </CardContent>
            </Card>
          ))}
        </Stack>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t('account.preferences.title')}
            </Typography>
            <Typography color="text.secondary">{t('account.preferences.language', { code: language })}</Typography>
            <Typography color="text.secondary">{t('account.preferences.support')}</Typography>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  )
}
