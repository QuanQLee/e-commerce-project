import Link from 'next/link'
import { useRouter } from 'next/router'
import { useMemo } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from '@mui/material'
import { useCart } from '../state/cart'
import { useI18n } from '../state/i18n'

export default function Cart() {
  const { items, removeItem, clear, total, currency } = useCart()
  const { t, locale } = useI18n()
  const router = useRouter()

  const formatter = useMemo(() => new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency || 'USD',
    currencyDisplay: 'narrowSymbol'
  }), [currency, locale])

  const handleCheckout = () => {
    if (items.length === 0) return
    router.push('/checkout')
  }

  return (
    <Container sx={{ py: 5 }}>
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={800}>
          {t('cart.header')}
        </Typography>

        {items.length === 0 && (
          <Card>
            <CardContent>
              <Typography color="text.secondary">{t('cart.empty')}</Typography>
              <Button component={Link} href="/products" sx={{ mt: 2 }}>
                {t('nav.browseProducts')}
              </Button>
            </CardContent>
          </Card>
        )}

        {items.length > 0 && (
          <Card>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('cart.table.product')}</TableCell>
                  <TableCell align="right">{t('cart.table.price')}</TableCell>
                  <TableCell align="center">{t('cart.table.quantity')}</TableCell>
                  <TableCell align="right">{t('cart.table.total')}</TableCell>
                  <TableCell width={100}>{t('cart.table.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Stack direction="row" spacing={2} alignItems="center">
                        {item.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imageUrl} alt={item.name} width={56} height={56} style={{ borderRadius: 8, objectFit: 'cover' }} />
                        )}
                        <Box>
                          <Typography fontWeight={600}>{item.name}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">{formatter.format(item.price)}</TableCell>
                    <TableCell align="center">{item.quantity}</TableCell>
                    <TableCell align="right">{formatter.format(item.price * item.quantity)}</TableCell>
                    <TableCell>
                      <Button color="error" size="small" onClick={() => removeItem(item.id)}>
                        {t('cart.remove')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Divider />
            <Box sx={{ px: 3, py: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
                <Typography fontWeight={700}>{t('cart.summaryTotal')}</Typography>
                <Typography fontWeight={800} variant="h5">
                  {formatter.format(total)}
                </Typography>
              </Stack>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 2 }}>
                <Button variant="contained" onClick={handleCheckout}>
                  {t('cart.proceedToCheckout')}
                </Button>
                <Button variant="text" color="inherit" onClick={clear}>
                  {t('cart.clear')}
                </Button>
              </Stack>
            </Box>
          </Card>
        )}
      </Stack>
    </Container>
  )
}
