import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import api from '../api'
import { useI18n } from '../state/i18n'

type Product = {
  id: string
  name: string
  description?: string
  price: number
  imageUrl?: string
  category?: string
  stock?: number
}

type ToastState = { message: string; severity: 'success' | 'error' } | null

type ProductForm = {
  name: string
  description: string
  price: string
  category: string
  stock: string
}

const INITIAL_FORM: ProductForm = {
  name: '',
  description: '',
  price: '',
  category: '',
  stock: ''
}

export default function Products() {
  const [keyword, setKeyword] = useState('')
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogLoading, setDialogLoading] = useState(false)
  const [form, setForm] = useState<ProductForm>(INITIAL_FORM)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<ToastState>(null)
  const { t, locale, currency } = useI18n()

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol'
      }),
    [locale, currency]
  )

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/v1/catalog/products')
      setItems(res.data || [])
    } catch (err: unknown) {
      const axiosError = err as { response?: { status?: number; data?: { message?: string } }; message?: string }
      const status = axiosError.response?.status
      if (status === 401) {
        setError(t('products.error401'))
      } else {
        setError(axiosError.response?.data?.message || axiosError.message || t('products.errorGeneric'))
      }
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filtered = keyword
    ? items.filter((product) => product.name.toLowerCase().includes(keyword.toLowerCase()))
    : items

  const updateForm = (field: keyof ProductForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const resetFormState = () => {
    setForm(INITIAL_FORM)
    setFormErrors({})
  }

  const validateForm = () => {
    const nextErrors: Record<string, string> = {}
    if (!form.name.trim()) nextErrors.name = t('products.nameRequired')
    const priceValue = Number(form.price)
    if (!form.price || Number.isNaN(priceValue) || priceValue < 0) {
      nextErrors.price = t('products.priceInvalid')
    }
    if (form.stock) {
      const stockValue = Number.parseInt(form.stock, 10)
      if (Number.isNaN(stockValue) || stockValue < 0) {
        nextErrors.stock = t('products.stockInvalid')
      }
    }
    setFormErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleCreateProduct = async () => {
    if (!validateForm()) return
    const priceValue = Number(form.price)
    const stockValue = form.stock ? Number.parseInt(form.stock, 10) : undefined
    setDialogLoading(true)
    try {
      await api.post('/api/v1/catalog/products', {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price: priceValue,
        category: form.category.trim() || undefined,
        stock: typeof stockValue === 'number' && !Number.isNaN(stockValue) ? stockValue : undefined
      })
      setToast({ severity: 'success', message: t('products.createSuccess') })
      setDialogOpen(false)
      resetFormState()
      await fetchData()
    } catch (err) {
      console.error(err)
      setToast({ severity: 'error', message: t('products.createFailure') })
    } finally {
      setDialogLoading(false)
    }
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
          {t('products.title')}
        </Typography>
        <Typography color="text.secondary">{t('products.subtitle')}</Typography>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
        <TextField
          size="small"
          label={t('products.searchPlaceholder')}
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          sx={{ width: { xs: '100%', sm: 260 } }}
        />
        <Button variant="contained" onClick={fetchData} disabled={loading}>
          {t('products.reload')}
        </Button>
        <Button variant="outlined" onClick={() => { resetFormState(); setDialogOpen(true) }}>
          {t('products.add')}
        </Button>
      </Stack>

      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CircularProgress size={20} />
          <Typography color="text.secondary">{t('common.loading')}</Typography>
        </Box>
      )}

      {!loading && error && (
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={fetchData}>{t('products.reload')}</Button>}>
          {error}
        </Alert>
      )}

      {!loading && !error && filtered.length === 0 && (
        <Card>
          <CardContent>
            <Typography color="text.secondary">{t('products.empty')}</Typography>
          </CardContent>
        </Card>
      )}

      {!loading && !error &&
        filtered.map((product) => (
          <Card key={product.id}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {product.name}
              </Typography>
              {product.category && (
                <Typography color="text.secondary" variant="body2" sx={{ mb: 0.5 }}>
                  {product.category}
                </Typography>
              )}
              {product.description && (
                <Typography color="text.secondary" sx={{ mb: 1 }}>
                  {product.description}
                </Typography>
              )}
              <Typography sx={{ fontWeight: 700 }}>
                {formatter.format(product.price)}
              </Typography>
              {typeof product.stock === 'number' && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {t('products.stockLabel', { value: product.stock })}
                </Typography>
              )}
            </CardContent>
          </Card>
        ))}

      <Dialog
        open={dialogOpen}
        onClose={() => {
          if (!dialogLoading) {
            setDialogOpen(false)
            resetFormState()
          }
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{t('products.add')}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t('products.formName')}
              value={form.name}
              onChange={updateForm('name')}
              error={Boolean(formErrors.name)}
              helperText={formErrors.name}
              autoFocus
              required
            />
            <TextField
              label={t('products.formDescription')}
              value={form.description}
              onChange={updateForm('description')}
              multiline
              minRows={2}
            />
            <TextField
              label={t('products.formPrice')}
              value={form.price}
              onChange={updateForm('price')}
              error={Boolean(formErrors.price)}
              helperText={formErrors.price}
              required
              type="number"
              inputProps={{ min: 0, step: '0.01' }}
            />
            <TextField
              label={t('products.formCategory')}
              value={form.category}
              onChange={updateForm('category')}
            />
            <TextField
              label={t('products.formStock')}
              value={form.stock}
              onChange={updateForm('stock')}
              error={Boolean(formErrors.stock)}
              helperText={formErrors.stock}
              type="number"
              inputProps={{ min: 0, step: 1 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { resetFormState(); setDialogOpen(false) }} disabled={dialogLoading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleCreateProduct} variant="contained" disabled={dialogLoading}>
            {dialogLoading ? t('common.loading') : t('products.add')}
          </Button>
        </DialogActions>
      </Dialog>

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

