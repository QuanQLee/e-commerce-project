import { Container, Typography } from '@mui/material'
import { useI18n } from '../state/i18n'

export default function Account() {
  const { t } = useI18n()

  return (
    <Container sx={{ py: 5 }}>
      <Typography variant="h4" gutterBottom>
        {t('account.header')}
      </Typography>
      <Typography color="text.secondary">{t('account.message')}</Typography>
    </Container>
  )
}
