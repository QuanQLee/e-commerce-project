import { useEffect, useState } from 'react'
import { Card, CardContent, Typography, Stack } from '@mui/material'
import api from '../api'
import { useI18n } from '../state/i18n'

interface Coupon { code: string; discount: number }

export default function Coupons() {
  const [items, setItems] = useState<Coupon[]>([])
  const { t } = useI18n()

  useEffect(() => {
    api
      .get('/api/v1/promotion/coupons')
      .then((response) => setItems(response.data || []))
      .catch(() => setItems([]))
  }, [])

  return (
    <Stack spacing={2}>
      {items.length === 0 && (
        <Typography color="text.secondary">{t('coupons.empty')}</Typography>
      )}
      {items.map((coupon) => (
        <Card key={coupon.code}>
          <CardContent>
            <Typography fontWeight={700}>{coupon.code}</Typography>
            <Typography color="text.secondary">
              {t('coupons.discount', { value: coupon.discount })}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Stack>
  )
}
