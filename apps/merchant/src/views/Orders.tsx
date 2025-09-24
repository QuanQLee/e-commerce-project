import { Card, CardContent, Typography } from '@mui/material'
import { useI18n } from '../state/i18n'

export default function Orders() {
  const { t } = useI18n()
  return (
    <Card>
      <CardContent>
        <Typography>{t('orders.empty')}</Typography>
      </CardContent>
    </Card>
  )
}
