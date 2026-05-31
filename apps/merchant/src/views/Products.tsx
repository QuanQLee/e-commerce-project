import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
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

type Sku = {
  id: string
  productId: string
  code: string
  price: number
  stock: number
  attributes: Record<string, string>
  isActive: boolean
}

type BatchSkuError = {
  index: number
  code: string
  error: string
}

type BatchSkuImportResult = {
  requested: number
  created: number
  skipped: number
  errors: BatchSkuError[]
}

type BatchSkuUpdateResult = {
  requested: number
  updated: number
  notFound: number
  errors: BatchSkuError[]
}

type ToastState = { message: string; severity: 'success' | 'error' } | null

type ProductForm = {
  name: string
  description: string
  price: string
  category: string
  stock: string
}

type SkuForm = {
  code: string
  price: string
  stock: string
  attributes: string
}

const INITIAL_FORM: ProductForm = {
  name: '',
  description: '',
  price: '',
  category: '',
  stock: ''
}

const INITIAL_SKU_FORM: SkuForm = {
  code: '',
  price: '',
  stock: '',
  attributes: ''
}

function parseAttributes(input: string): Record<string, string> {
  const result: Record<string, string> = {}
  const chunks = input.split(/[|,]/).map((item) => item.trim()).filter(Boolean)
  chunks.forEach((chunk) => {
    const parts = chunk.split('=')
    if (parts.length < 2) return
    const key = parts[0].trim()
    const value = parts.slice(1).join('=').trim()
    if (key && value) result[key] = value
  })
  return result
}

function formatAttributes(attributes: Record<string, string>) {
  return Object.entries(attributes).map(([key, value]) => `${key}: ${value}`).join(', ')
}

function downloadTextFile(filename: string, content: string) {
  if (typeof window === 'undefined') return
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
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

  const [skuDialogOpen, setSkuDialogOpen] = useState(false)
  const [skuDialogLoading, setSkuDialogLoading] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [skuItems, setSkuItems] = useState<Sku[]>([])
  const [skuForm, setSkuForm] = useState<SkuForm>(INITIAL_SKU_FORM)
  const [editingSkuId, setEditingSkuId] = useState<string | null>(null)
  const [skuError, setSkuError] = useState<string | null>(null)
  const [csvInput, setCsvInput] = useState('')
  const [batchResult, setBatchResult] = useState<BatchSkuImportResult | null>(null)
  const [batchUpdateCsvInput, setBatchUpdateCsvInput] = useState('')
  const [batchUpdateResult, setBatchUpdateResult] = useState<BatchSkuUpdateResult | null>(null)
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

  const fetchSkus = useCallback(async (productId: string) => {
    setSkuDialogLoading(true)
    setSkuError(null)
    try {
      const res = await api.get(`/api/v1/catalog/products/${productId}/skus`)
      setSkuItems(res.data || [])
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string; message?: string } }; message?: string }
      setSkuError(axiosError.response?.data?.error || axiosError.response?.data?.message || axiosError.message || 'Failed to load SKUs')
      setSkuItems([])
    } finally {
      setSkuDialogLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filtered = keyword
    ? items.filter((product) => product.name.toLowerCase().includes(keyword.toLowerCase()))
    : items

  const updateForm = (field: keyof ProductForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const updateSkuForm = (field: keyof SkuForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setSkuForm((prev) => ({ ...prev, [field]: event.target.value }))
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

  const openSkuDialog = async (product: Product) => {
    setSelectedProduct(product)
    setSkuDialogOpen(true)
    setSkuForm(INITIAL_SKU_FORM)
    setEditingSkuId(null)
    setCsvInput('')
    setBatchResult(null)
    setBatchUpdateCsvInput('')
    setBatchUpdateResult(null)
    await fetchSkus(product.id)
  }

  const handleCreateOrUpdateSku = async () => {
    if (!selectedProduct) return
    const price = Number(skuForm.price)
    const stock = Number.parseInt(skuForm.stock, 10)
    if (!skuForm.code.trim() || Number.isNaN(price) || price < 0 || Number.isNaN(stock) || stock < 0) {
      setToast({ severity: 'error', message: 'SKU code/price/stock is invalid' })
      return
    }

    try {
      const payload = {
        code: skuForm.code.trim(),
        price,
        stock,
        attributes: parseAttributes(skuForm.attributes)
      }
      if (editingSkuId) {
        await api.put(`/api/v1/catalog/products/${selectedProduct.id}/skus/${editingSkuId}`, payload)
        setToast({ severity: 'success', message: 'SKU updated' })
      } else {
        await api.post(`/api/v1/catalog/products/${selectedProduct.id}/skus`, payload)
        setToast({ severity: 'success', message: 'SKU created' })
      }
      setSkuForm(INITIAL_SKU_FORM)
      setEditingSkuId(null)
      await fetchSkus(selectedProduct.id)
    } catch (err) {
      console.error(err)
      setToast({ severity: 'error', message: editingSkuId ? 'Failed to update SKU' : 'Failed to create SKU' })
    }
  }

  const toggleSkuStatus = async (sku: Sku) => {
    if (!selectedProduct) return
    try {
      await api.patch(`/api/v1/catalog/products/${selectedProduct.id}/skus/${sku.id}/status`, {
        isActive: !sku.isActive
      })
      await fetchSkus(selectedProduct.id)
    } catch (err) {
      console.error(err)
      setToast({ severity: 'error', message: 'Failed to update SKU status' })
    }
  }

  const startEditSku = (sku: Sku) => {
    setEditingSkuId(sku.id)
    setSkuForm({
      code: sku.code,
      price: String(sku.price),
      stock: String(sku.stock),
      attributes: Object.entries(sku.attributes).map(([key, value]) => `${key}=${value}`).join(',')
    })
  }

  const cancelEditSku = () => {
    setEditingSkuId(null)
    setSkuForm(INITIAL_SKU_FORM)
  }

  const deleteSku = async (sku: Sku) => {
    if (!selectedProduct) return
    const ok = typeof window === 'undefined' ? true : window.confirm(`Delete SKU ${sku.code}?`)
    if (!ok) return
    try {
      await api.delete(`/api/v1/catalog/products/${selectedProduct.id}/skus/${sku.id}`)
      if (editingSkuId === sku.id) {
        cancelEditSku()
      }
      setToast({ severity: 'success', message: 'SKU deleted' })
      await fetchSkus(selectedProduct.id)
    } catch (err) {
      console.error(err)
      setToast({ severity: 'error', message: 'Failed to delete SKU' })
    }
  }

  const parseCsvToBatchItems = (raw: string) => {
    const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    if (lines.length === 0) return []
    const hasHeader = lines[0].toLowerCase().includes('code')
    const dataLines = hasHeader ? lines.slice(1) : lines
    return dataLines.map((line) => {
      const [code = '', priceRaw = '0', stockRaw = '0', attrsRaw = ''] = line.split(',').map((s) => s.trim())
      return {
        code,
        price: Number(priceRaw),
        stock: Number.parseInt(stockRaw, 10),
        attributes: parseAttributes(attrsRaw)
      }
    })
  }

  const parseCsvToBatchUpdateItems = (raw: string) => {
    const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    if (lines.length === 0) return []
    const hasHeader = lines[0].toLowerCase().includes('code')
    const dataLines = hasHeader ? lines.slice(1) : lines
    return dataLines.map((line) => {
      const [code = '', priceRaw = '', stockRaw = '', activeRaw = ''] = line.split(',').map((s) => s.trim())
      return {
        code,
        ...(priceRaw ? { price: Number(priceRaw) } : {}),
        ...(stockRaw ? { stock: Number.parseInt(stockRaw, 10) } : {}),
        ...(activeRaw ? { isActive: activeRaw.toLowerCase() === 'true' } : {})
      }
    })
  }

  const handleCsvFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setCsvInput(text)
  }

  const importBatchSkus = async () => {
    if (!selectedProduct) return
    const items = parseCsvToBatchItems(csvInput)
    if (items.length === 0) {
      setToast({ severity: 'error', message: 'CSV is empty' })
      return
    }
    try {
      const res = await api.post(`/api/v1/catalog/products/${selectedProduct.id}/skus/batch`, { items })
      setBatchResult(res.data as BatchSkuImportResult)
      await fetchSkus(selectedProduct.id)
      setToast({ severity: 'success', message: 'Batch import completed' })
    } catch (err) {
      console.error(err)
      setToast({ severity: 'error', message: 'Batch import failed' })
    }
  }

  const batchUpdateSkus = async () => {
    if (!selectedProduct) return
    const items = parseCsvToBatchUpdateItems(batchUpdateCsvInput)
    if (items.length === 0) {
      setToast({ severity: 'error', message: 'Batch update CSV is empty' })
      return
    }
    try {
      const res = await api.patch(`/api/v1/catalog/products/${selectedProduct.id}/skus/batch-update`, { items })
      setBatchUpdateResult(res.data as BatchSkuUpdateResult)
      await fetchSkus(selectedProduct.id)
      setToast({ severity: 'success', message: 'Batch update completed' })
    } catch (err) {
      console.error(err)
      setToast({ severity: 'error', message: 'Batch update failed' })
    }
  }

  const exportSkuCsv = () => {
    const header = 'code,price,stock,isActive,attributes'
    const rows = skuItems.map((sku) => {
      const attrs = Object.entries(sku.attributes).map(([k, v]) => `${k}=${v}`).join('|')
      return `${sku.code},${sku.price},${sku.stock},${sku.isActive},${attrs}`
    })
    downloadTextFile(`skus-${selectedProduct?.id ?? 'product'}.csv`, [header, ...rows].join('\n'))
  }

  const downloadBatchErrorsCsv = (errors: BatchSkuError[], name: string) => {
    if (!errors.length) return
    const header = 'row,code,error'
    const rows = errors.map((e) => `${e.index + 1},${e.code},${e.error}`)
    downloadTextFile(name, [header, ...rows].join('\n'))
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
              <Stack direction="row" spacing={1.5} sx={{ mt: 1.5 }}>
                <Button size="small" variant="outlined" onClick={() => openSkuDialog(product)}>
                  Manage SKUs
                </Button>
              </Stack>
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

      <Dialog
        open={skuDialogOpen}
        onClose={() => {
          if (!skuDialogLoading) setSkuDialogOpen(false)
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          SKU Editor
          {selectedProduct ? ` - ${selectedProduct.name}` : ''}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              {editingSkuId ? 'Edit SKU' : 'Add SKU'} (attributes format: key=value,key2=value2)
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField label="Code" value={skuForm.code} onChange={updateSkuForm('code')} />
              <TextField label="Price" type="number" value={skuForm.price} onChange={updateSkuForm('price')} />
              <TextField label="Stock" type="number" value={skuForm.stock} onChange={updateSkuForm('stock')} />
            </Stack>
            <TextField
              label="Attributes"
              value={skuForm.attributes}
              onChange={updateSkuForm('attributes')}
              placeholder="color=black,storage=128g"
            />
            <Stack direction="row" spacing={1.5}>
              <Button variant="contained" onClick={handleCreateOrUpdateSku} disabled={skuDialogLoading || !selectedProduct}>
                {editingSkuId ? 'Save SKU' : 'Create SKU'}
              </Button>
              {editingSkuId && (
                <Button variant="outlined" onClick={cancelEditSku} disabled={skuDialogLoading}>
                  Cancel Edit
                </Button>
              )}
            </Stack>

            <Divider />
            <Typography variant="subtitle2">Batch Import (CSV)</Typography>
            <Typography variant="caption" color="text.secondary">
              Format: code,price,stock,attributes | example: SKU-RED-128,3999,10,color=red|storage=128g
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <Button variant="outlined" component="label">
                Upload CSV
                <input hidden accept=".csv,text/csv" type="file" onChange={handleCsvFileChange} />
              </Button>
              <Button variant="contained" onClick={importBatchSkus} disabled={skuDialogLoading || !selectedProduct}>
                Import CSV
              </Button>
            </Stack>
            <TextField
              label="CSV Content"
              value={csvInput}
              onChange={(event) => setCsvInput(event.target.value)}
              multiline
              minRows={5}
              placeholder="code,price,stock,attributes&#10;SKU-1,100,10,color=black|storage=128g"
            />
            {batchResult && (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="body2">
                    Requested: {batchResult.requested} | Created: {batchResult.created} | Skipped: {batchResult.skipped}
                  </Typography>
                  {batchResult.errors.length > 0 && (
                    <Button
                      size="small"
                      sx={{ mt: 1 }}
                      onClick={() => downloadBatchErrorsCsv(batchResult.errors, 'sku-import-errors.csv')}
                    >
                      Download Import Errors CSV
                    </Button>
                  )}
                  {batchResult.errors.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="subtitle2">Failed Rows</Typography>
                      {batchResult.errors.map((item) => (
                        <Typography key={`${item.index}-${item.code}`} variant="caption" display="block" color="error">
                          Row {item.index + 1}: {item.code || '(empty code)'} - {item.error}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}

            <Divider />
            <Typography variant="subtitle2">Batch Update (CSV)</Typography>
            <Typography variant="caption" color="text.secondary">
              Format: code,price,stock,isActive (price/stock/isActive can be empty)
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button variant="contained" onClick={batchUpdateSkus} disabled={skuDialogLoading || !selectedProduct}>
                Run Batch Update
              </Button>
              <Button variant="outlined" onClick={exportSkuCsv} disabled={skuDialogLoading || skuItems.length === 0}>
                Export SKUs CSV
              </Button>
            </Stack>
            <TextField
              label="Batch Update CSV Content"
              value={batchUpdateCsvInput}
              onChange={(event) => setBatchUpdateCsvInput(event.target.value)}
              multiline
              minRows={4}
              placeholder="code,price,stock,isActive&#10;SKU-1,129,20,true"
            />
            {batchUpdateResult && (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="body2">
                    Requested: {batchUpdateResult.requested} | Updated: {batchUpdateResult.updated} | NotFound: {batchUpdateResult.notFound}
                  </Typography>
                  {batchUpdateResult.errors.length > 0 && (
                    <Button
                      size="small"
                      sx={{ mt: 1 }}
                      onClick={() => downloadBatchErrorsCsv(batchUpdateResult.errors, 'sku-update-errors.csv')}
                    >
                      Download Update Errors CSV
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            <Divider />
            <Typography variant="subtitle2">Existing SKUs</Typography>
            {skuDialogLoading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CircularProgress size={18} />
                <Typography color="text.secondary">Loading SKUs...</Typography>
              </Box>
            )}
            {!skuDialogLoading && skuError && <Alert severity="error">{skuError}</Alert>}
            {!skuDialogLoading && !skuError && skuItems.length === 0 && (
              <Typography color="text.secondary">No SKUs yet.</Typography>
            )}
            {!skuDialogLoading && !skuError && skuItems.map((sku) => (
              <Card key={sku.id} variant="outlined">
                <CardContent>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }}>
                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>{sku.code}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatter.format(sku.price)} | Stock: {sku.stock}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatAttributes(sku.attributes) || 'No attributes'}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip size="small" label={sku.isActive ? 'Active' : 'Inactive'} color={sku.isActive ? 'success' : 'default'} />
                      <Button size="small" onClick={() => startEditSku(sku)}>
                        Edit
                      </Button>
                      <Button size="small" onClick={() => toggleSkuStatus(sku)}>
                        {sku.isActive ? 'Disable' : 'Enable'}
                      </Button>
                      <Button size="small" color="error" onClick={() => deleteSku(sku)}>
                        Delete
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSkuDialogOpen(false)} disabled={skuDialogLoading}>
            Close
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
