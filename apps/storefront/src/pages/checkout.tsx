import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography
} from '@mui/material'
import api from '../lib/api'
import { useCart } from '../state/cart'
import { useI18n } from '../state/i18n'

const STORAGE_KEY = 'storefront_checkout_draft'

const steps = ['details', 'shipping', 'payment', 'review'] as const

type StepKey = (typeof steps)[number]

type CheckoutState = {
  name: string
  email: string
  phone: string
  addressLine1: string
  addressLine2: string
  city: string
  postalCode: string
  country: string
  shippingMethod: 'standard' | 'express'
  paymentMethod: 'card' | 'cod'
  cardNumber: string
  cardExpiry: string
  cardCvc: string
  notes: string
}

const DEFAULT_STATE: CheckoutState = {
  name: '',
  email: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  postalCode: '',
  country: '',
  shippingMethod: 'standard',
  paymentMethod: 'card',
  cardNumber: '',
  cardExpiry: '',
  cardCvc: '',
  notes: ''
}

export default function Checkout() {
  const { items, total, currency, clear } = useCart()
  const { t, locale } = useI18n()
  const router = useRouter()
  const [stepIndex, setStepIndex] = useState(0)
  const [form, setForm] = useState<CheckoutState>(DEFAULT_STATE)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      setForm({ ...DEFAULT_STATE, ...parsed })
    } catch (err) {
      console.warn('[checkout] failed to load draft', err)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form))
    } catch (err) {
      console.warn('[checkout] failed to persist draft', err)
    }
  }, [form])

  const formatter = useMemo(() => new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency || 'USD',
    currencyDisplay: 'narrowSymbol'
  }), [currency, locale])

  const shippingCost = form.shippingMethod === 'express' ? 12 : 0
  const orderTotal = useMemo(() => total + shippingCost, [shippingCost, total])

  const updateField = (key: keyof CheckoutState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }))
  }

  const validateStep = (step: StepKey) => {
    const errors: string[] = []
    if (step === 'details') {
      if (!form.name.trim()) errors.push(t('checkout.errors.nameRequired'))
      if (!form.email.trim()) errors.push(t('checkout.errors.emailRequired'))
      if (!form.addressLine1.trim()) errors.push(t('checkout.errors.addressRequired'))
      if (!form.city.trim() || !form.country.trim()) errors.push(t('checkout.errors.cityRequired'))
      if (!form.postalCode.trim()) errors.push(t('checkout.errors.postalRequired'))
    }
    if (step === 'payment' && form.paymentMethod === 'card') {
      if (!/^[0-9]{12,19}$/.test(form.cardNumber.replace(/\s+/g, ''))) errors.push(t('checkout.errors.cardNumber'))
      if (!/^[0-9]{3,4}$/.test(form.cardCvc.trim())) errors.push(t('checkout.errors.cardCvc'))
      if (!/^[0-9]{2}\/[0-9]{2}$/.test(form.cardExpiry.trim())) errors.push(t('checkout.errors.cardExpiry'))
    }
    if (errors.length) {
      setError(errors.join('\n'))
      return false
    }
    setError(null)
    return true
  }

  const handleNext = () => {
    const currentStep = steps[stepIndex]
    if (!validateStep(currentStep)) return
    setStepIndex((idx) => Math.min(idx + 1, steps.length - 1))
  }

  const handleBack = () => {
    setError(null)
    setStepIndex((idx) => Math.max(0, idx - 1))
  }

  const handleSubmit = async () => {
    if (items.length === 0) {
      setError(t('checkout.errors.emptyCart'))
      return
    }
    if (!validateStep('payment')) return
    setLoading(true)
    setError(null)
    try {
      const payload = {
        customer: {
          name: form.name,
          email: form.email,
          phone: form.phone
        },
        shipping: {
          method: form.shippingMethod,
          address: {
            line1: form.addressLine1,
            line2: form.addressLine2,
            city: form.city,
            postalCode: form.postalCode,
            country: form.country
          }
        },
        payment: {
          method: form.paymentMethod,
          metadata: form.paymentMethod === 'card' ? {
            last4: form.cardNumber.slice(-4),
            expiry: form.cardExpiry
          } : {}
        },
        notes: form.notes,
        items: items.map((item) => ({
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        }))
      }
      const response = await api.post('/api/v1/order/orders', payload)
      setSuccessMessage(t('checkout.success'))
      clear()
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(STORAGE_KEY)
        }
      } catch (storageError) {
        console.warn('[checkout] failed to clear draft', storageError)
      }
      const orderId = response?.data?.id
      setTimeout(() => {
        if (orderId) {
          router.push(`/account/orders?highlight=${orderId}`)
        } else {
          router.push('/account/orders')
        }
      }, 800)
    } catch (err) {
      console.error(err)
      setError(t('checkout.errors.submitFailed'))
    } finally {
      setLoading(false)
    }
  }

  const renderDetailsStep = () => (
    <Stack spacing={2}>
      <TextField label={t('checkout.form.name')} value={form.name} onChange={updateField('name')} required />
      <TextField label={t('checkout.form.email')} value={form.email} onChange={updateField('email')} type="email" required />
      <TextField label={t('checkout.form.phone')} value={form.phone} onChange={updateField('phone')} />
      <Divider sx={{ my: 1 }} />
      <TextField label={t('checkout.form.address1')} value={form.addressLine1} onChange={updateField('addressLine1')} required />
      <TextField label={t('checkout.form.address2')} value={form.addressLine2} onChange={updateField('addressLine2')} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField label={t('checkout.form.city')} value={form.city} onChange={updateField('city')} required fullWidth />
        <TextField label={t('checkout.form.postal')} value={form.postalCode} onChange={updateField('postalCode')} required fullWidth />
      </Stack>
      <TextField label={t('checkout.form.country')} value={form.country} onChange={updateField('country')} required />
    </Stack>
  )

  const renderShippingStep = () => (
    <FormControl>
      <FormLabel>{t('checkout.form.shipping')}</FormLabel>
      <RadioGroup value={form.shippingMethod} onChange={(event) => setForm((prev) => ({ ...prev, shippingMethod: event.target.value as CheckoutState['shippingMethod'] }))}>
        <FormControlLabel value="standard" control={<Radio />} label={t('checkout.shipping.standard')} />
        <FormControlLabel value="express" control={<Radio />} label={t('checkout.shipping.express')} />
      </RadioGroup>
      <TextField label={t('checkout.form.notes')} value={form.notes} onChange={updateField('notes')} multiline minRows={3} sx={{ mt: 2 }} />
    </FormControl>
  )

  const renderPaymentStep = () => (
    <Stack spacing={2}>
      <FormControl>
        <FormLabel>{t('checkout.form.payment')}</FormLabel>
        <RadioGroup value={form.paymentMethod} onChange={(event) => setForm((prev) => ({ ...prev, paymentMethod: event.target.value as CheckoutState['paymentMethod'] }))}>
          <FormControlLabel value="card" control={<Radio />} label={t('checkout.payment.card')} />
          <FormControlLabel value="cod" control={<Radio />} label={t('checkout.payment.cod')} />
        </RadioGroup>
      </FormControl>
      {form.paymentMethod === 'card' && (
        <Stack spacing={2}>
          <TextField label={t('checkout.form.cardNumber')} value={form.cardNumber} onChange={updateField('cardNumber')} placeholder="4242 4242 4242 4242" />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label={t('checkout.form.cardExpiry')} value={form.cardExpiry} onChange={updateField('cardExpiry')} placeholder="MM/YY" />
            <TextField label={t('checkout.form.cardCvc')} value={form.cardCvc} onChange={updateField('cardCvc')} placeholder="123" />
          </Stack>
        </Stack>
      )}
    </Stack>
  )

  const renderReviewStep = () => (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6">{t('checkout.review.items')}</Typography>
        <Stack spacing={1} sx={{ mt: 1 }}>
          {items.map((item) => (
            <Stack key={item.id} direction="row" justifyContent="space-between" alignItems="center">
              <Typography>{item.name} × {item.quantity}</Typography>
              <Typography>{formatter.format(item.price * item.quantity)}</Typography>
            </Stack>
          ))}
        </Stack>
      </Box>
      <Box>
        <Typography variant="h6">{t('checkout.review.shipping')}</Typography>
        <Typography color="text.secondary">{form.shippingMethod === 'express' ? t('checkout.shipping.express') : t('checkout.shipping.standard')}</Typography>
      </Box>
      <Box>
        <Typography variant="h6">{t('checkout.review.payment')}</Typography>
        <Typography color="text.secondary">
          {form.paymentMethod === 'card' ? `${t('checkout.payment.card')} •••• ${form.cardNumber.slice(-4)}` : t('checkout.payment.cod')}
        </Typography>
      </Box>
    </Stack>
  )

  const renderStepContent = () => {
    const key = steps[stepIndex]
    switch (key) {
      case 'details':
        return renderDetailsStep()
      case 'shipping':
        return renderShippingStep()
      case 'payment':
        return renderPaymentStep()
      case 'review':
        return renderReviewStep()
      default:
        return null
    }
  }

  return (
    <Container sx={{ py: 5 }}>
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={800}>
          {t('checkout.title')}
        </Typography>

        {items.length === 0 && (
          <Alert severity="info">{t('checkout.errors.emptyCart')}</Alert>
        )}

        <Card>
          <CardContent>
            <Stepper activeStep={stepIndex} alternativeLabel>
              {steps.map((labelKey) => (
                <Step key={labelKey}>
                  <StepLabel>{t(`checkout.steps.${labelKey}`)}</StepLabel>
                </Step>
              ))}
            </Stepper>
            <Box sx={{ mt: 3 }}>{renderStepContent()}</Box>
            {error && (
              <Alert severity="error" sx={{ mt: 3, whiteSpace: 'pre-line' }}>
                {error}
              </Alert>
            )}
            {successMessage && (
              <Alert severity="success" sx={{ mt: 3 }}>
                {successMessage}
              </Alert>
            )}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" sx={{ mt: 3 }}>
              <Button variant="text" disabled={stepIndex === 0 || loading} onClick={handleBack}>
                {t('checkout.actions.back')}
              </Button>
              {stepIndex < steps.length - 1 && (
                <Button variant="contained" onClick={handleNext} disabled={loading || items.length === 0}>
                  {t('checkout.actions.next')}
                </Button>
              )}
              {stepIndex === steps.length - 1 && (
                <Button variant="contained" color="primary" onClick={handleSubmit} disabled={loading || items.length === 0}>
                  {loading ? t('checkout.actions.submitting') : t('checkout.actions.placeOrder')}
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between">
                <Typography>{t('checkout.summary.items')}</Typography>
                <Typography>{formatter.format(total)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography>{t('checkout.summary.shipping')}</Typography>
                <Typography>{shippingCost === 0 ? t('checkout.summary.free') : formatter.format(shippingCost)}</Typography>
              </Stack>
              <Divider />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography fontWeight={700}>{t('checkout.summary.total')}</Typography>
                <Typography variant="h5" fontWeight={800}>{formatter.format(orderTotal)}</Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  )
}
