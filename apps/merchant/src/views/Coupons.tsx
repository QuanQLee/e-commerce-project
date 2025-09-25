import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Card, CardContent, Snackbar, Stack, TextField, Typography } from '@mui/material'
import api from '../api'
import { useI18n } from '../state/i18n'

interface Coupon { code: string; discount: number }

type ToastState = { message: string; severity: 'success' | 'error' } | null

export default function Coupons() {
  const [items, setItems] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState('')
  const [discount, setDiscount] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [errors, setErrors] = useState<{ code?: string; discount?: string }>({})
  const [toast, setToast] = useState<ToastState>(null)
  const { t } = useI18n()

  const fetchCoupons = useCallback(async () => {
    setLoading(true)
    try {
      const response = await api.get('/api/v1/promotion/coupons')
      setItems(response.data || [])
    } catch (error) {
      console.error(error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCoupons()
  }, [fetchCoupons])

  const validateForm = () => {
    const next: { code?: string; discount?: string } = {}
    if (!code.trim()) next.code = t('coupons.codeRequired')
    const discountValue = Number(discount)
    if (!discount || Number.isNaN(discountValue) || discountValue < 0 || discountValue > 100) {
      next.discount = t('coupons.discountInvalid')
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleCreate = async () => {
    if (!validateForm()) return
    setSubmitLoading(true)
    try {
      await api.post('/api/v1/promotion/coupons', {
        code: code.trim(),
        discount: Number(discount)
      })
      setToast({ severity: 'success', message: t('coupons.createSuccess') })
      setCode('')
      setDiscount('')
      setErrors({})
      await fetchCoupons()
    } catch (error) {
      console.error(error)
      setToast({ severity: 'error', message: t('coupons.createFailure') })
    } finally {
      setSubmitLoading(false)
    }
  }

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'flex-end' }}>
        <TextField
          label={t('coupons.codeLabel')}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          error={Boolean(errors.code)}
          helperText={errors.code}
        />
        <TextField
          label={t('coupons.discountLabel')}
          value={discount}
          onChange={(event) => setDiscount(event.target.value)}
          error={Boolean(errors.discount)}
          helperText={errors.discount}
          type="number"
          inputProps={{ min: 0, max: 100 }}
        />
        <Button variant="contained" onClick={handleCreate} disabled={submitLoading}>
          {submitLoading ? t('common.loading') : t('coupons.create')}
        </Button>
      </Stack>

      {loading && (
        <Typography color="text.secondary">{t('common.loading')}</Typography>
      )}

      {!loading && items.length === 0 && (
        <Typography color="text.secondary">{t('coupons.empty')}</Typography>
      )}

      {!loading &&
        items.map((coupon) => (
          <Card key={coupon.code}>
            <CardContent>
              <Typography fontWeight={700}>{coupon.code}</Typography>
              <Typography color="text.secondary">
                {t('coupons.discount', { value: coupon.discount })}
              </Typography>
            </CardContent>
          </Card>
        ))}

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={toast?.severity ?? 'success'}
          onClose={() => setToast(null)}
          sx={{ width: '100%' }}
        >
          {toast?.message ?? ''}
        </Alert>
      </Snackbar>
    </Stack>
  )
}

