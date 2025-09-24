import { Container, Typography } from '@mui/material'
import { useI18n } from '../state/i18n'

export default function Cart() {
  const { t } = useI18n()

  return (
    <Container sx={{ py: 5 }}>
      <Typography variant="h4" gutterBottom>
        {t('cart.header')}
      </Typography>
      <Typography color="text.secondary">{t('cart.empty')}</Typography>
    </Container>
  )
}
