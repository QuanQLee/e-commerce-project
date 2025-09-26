import { useEffect, useMemo, useState } from 'react'
import type { SelectChangeEvent } from '@mui/material/Select'
import {
  Alert,
  Box,
  Card,
  CardContent,
  Container,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from '@mui/material'
import api from '../api/api'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'
import PageHeader from '../components/PageHeader'

interface MetricRow {
  key: string
  value: number
  category: 'revenue' | 'conversion' | 'operations' | 'other'
}

const CATEGORY_KEYWORDS: Record<MetricRow['category'], string[]> = {
  revenue: ['gmv', 'revenue', 'sales', 'amount', 'arpu', 'aov'],
  conversion: ['conversion', 'rate', 'ctr', 'retention', 'bounce'],
  operations: ['orders', 'inventory', 'stock', 'latency', 'tickets', 'shipments'],
  other: []
}

function detectCategory(key: string): MetricRow['category'] {
  const lower = key.toLowerCase()
  return (Object.entries(CATEGORY_KEYWORDS).find(([, words]) =>
    words.some((candidate) => lower.includes(candidate))
  )?.[0] as MetricRow['category']) || 'other'
}

function formatMetric(key: string, value: number) {
  const lower = key.toLowerCase()
  if (Number.isNaN(value)) return 'N/A'
  if (lower.includes('revenue') || lower.includes('gmv') || lower.includes('sales') || lower.includes('amount')) {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: value < 10 ? 2 : 0
    }).format(value)
  }
  if (lower.includes('rate') || lower.includes('conversion') || lower.endsWith('_pct')) {
    return `${(value * (lower.endsWith('_pct') ? 1 : 100)).toFixed(1)}%`
  }
  if (Math.abs(value) > 9999) {
    return new Intl.NumberFormat(undefined, {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value)
  }
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2)
}

function normaliseMetrics(payload: Record<string, unknown> | null | undefined): MetricRow[] {
  if (!payload) return []
  return Object.entries(payload)
    .map(([key, raw]) => {
      let value = NaN
      if (typeof raw === 'number') {
        value = raw
      } else if (raw && typeof raw === 'object') {
        if ('value' in raw && typeof (raw as Record<string, unknown>).value === 'number') {
          value = (raw as { value: number }).value
        } else if ('current' in raw && typeof (raw as Record<string, unknown>).current === 'number') {
          value = (raw as { current: number }).current
        }
      }
      return {
        key,
        value,
        category: detectCategory(key)
      }
    })
    .filter((item) => Number.isFinite(item.value))
}

export default function Metrics() {
  const [rawMetrics, setRawMetrics] = useState<MetricRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<MetricRow['category'] | 'all'>('all')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    api
      .get('/api/v1/analytics/metrics')
      .then((res) => {
        if (!active) return
        setRawMetrics(normaliseMetrics(res.data))
      })
      .catch((err: unknown) => {
        console.error(err)
        if (!active) return
        setError('Failed to load metrics overview')
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const grouped = useMemo(() => {
    const buckets: Record<MetricRow['category'], MetricRow[]> = {
      revenue: [],
      conversion: [],
      operations: [],
      other: []
    }
    rawMetrics.forEach((metric) => {
      buckets[metric.category].push(metric)
    })
    return buckets
  }, [rawMetrics])

  const filtered = useMemo(() => {
    const source = category === 'all' ? rawMetrics : grouped[category]
    return [...source].sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
  }, [category, grouped, rawMetrics])

  const headline = useMemo(
    () =>
      ['revenue', 'conversion', 'operations']
        .map((key) => {
          const list = grouped[key as MetricRow['category']]
          if (!list.length) return null
          const top = [...list].sort((a, b) => Math.abs(b.value) - Math.abs(a.value))[0]
          return { ...top, label: key }
        })
        .filter(Boolean) as Array<MetricRow & { label: string }>,
    [grouped]
  )

  return (
    <Container>
      <PageHeader title="Metrics" subtitle="Performance signals pulled from the analytics service" />
      {loading && <Loading lines={4} />}
      {error && <ErrorState message={error} />}

      {!loading && !error && rawMetrics.length === 0 && (
        <Alert severity="info">No metrics available yet.</Alert>
      )}

      {!loading && !error && rawMetrics.length > 0 && (
        <Stack spacing={4}>
          {headline.length > 0 && (
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              {headline.map((item) => (
                <Card key={item.key} sx={{ flex: 1 }}>
                  <CardContent>
                    <Typography variant="overline" color="text.secondary">
                      {item.label.toUpperCase()}
                    </Typography>
                    <Typography variant="h4" sx={{ mt: 1 }}>
                      {formatMetric(item.key, item.value)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {item.key}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}

          <Box>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} sx={{ mb: 2 }}>
              <Typography variant="h6">Detailed metrics</Typography>
              <FormControl size="small" sx={{ width: { xs: '100%', sm: 220 } }}>
                <InputLabel id="metric-category-label">Category</InputLabel>
                <Select
                  labelId="metric-category-label"
                  label="Category"
                  value={category}
                  onChange={(event: SelectChangeEvent<MetricRow['category'] | 'all'>) => {
                    setCategory(event.target.value as MetricRow['category'] | 'all')
                  }}
                >
                  <MenuItem value="all">All metrics</MenuItem>
                  <MenuItem value="revenue">Revenue</MenuItem>
                  <MenuItem value="conversion">Conversion</MenuItem>
                  <MenuItem value="operations">Operations</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <Card>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Metric</TableCell>
                    <TableCell align="right">Value</TableCell>
                    <TableCell width={140}>Category</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((metric) => (
                    <TableRow key={metric.key} hover>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{metric.key}</TableCell>
                      <TableCell align="right">{formatMetric(metric.key, metric.value)}</TableCell>
                      <TableCell sx={{ textTransform: 'capitalize' }}>{metric.category}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Divider />
              <Box sx={{ px: 3, py: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Showing {filtered.length} of {rawMetrics.length} metrics.
                </Typography>
              </Box>
            </Card>
          </Box>
        </Stack>
      )}
    </Container>
  )
}




