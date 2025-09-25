import { useEffect, useMemo, useState } from 'react'
import { Box, Card, CardContent, Container, Divider, LinearProgress, Stack, Typography } from '@mui/material'
import api from '../api/api'
import PageHeader from '../components/PageHeader'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'

type MetricValue = number | { value?: number; delta?: number; trend?: number } | Array<number | { value?: number }>

interface MetricEntry {
  key: string
  label: string
  value: number
  delta?: number
}

function titleCase(input: string) {
  return input
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function normaliseMetrics(payload: Record<string, MetricValue> | null | undefined): MetricEntry[] {
  if (!payload) return []
  return Object.entries(payload).map(([key, raw]) => {
    let value = 0
    let delta: number | undefined

    if (typeof raw === 'number') {
      value = raw
    } else if (Array.isArray(raw)) {
      const last = raw.at(-1)
      if (typeof last === 'number') {
        value = last
      } else if (last && typeof last === 'object') {
        value = typeof last.value === 'number' ? last.value : 0
      }
      const prev = raw.at(-2)
      const prevValue = typeof prev === 'number' ? prev : typeof prev === 'object' && prev ? prev.value : undefined
      if (typeof prevValue === 'number' && typeof value === 'number') {
        delta = value - prevValue
      }
    } else if (raw && typeof raw === 'object') {
      value = typeof raw.value === 'number' ? raw.value : 0
      delta = typeof raw.delta === 'number' ? raw.delta : typeof raw.trend === 'number' ? raw.trend : undefined
    }

    return {
      key,
      label: titleCase(key),
      value,
      delta,
    }
  })
}

function formatMetricValue(key: string, value: number) {
  if (Number.isNaN(value)) return '—'
  const lower = key.toLowerCase()
  if (lower.includes('revenue') || lower.includes('gmv') || lower.includes('sales') || lower.includes('amount')) {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: value < 10 ? 2 : 0,
    }).format(value)
  }
  if (Math.abs(value) > 9999) {
    return new Intl.NumberFormat(undefined, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  }
  if (Number.isInteger(value)) {
    return value.toLocaleString()
  }
  return value.toFixed(2)
}

function formatDelta(delta: number) {
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toFixed(delta % 1 === 0 ? 0 : 2)}`
}

export default function Dashboard() {
  const [entries, setEntries] = useState<MetricEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    api
      .get('/api/v1/analytics/metrics')
      .then((response) => {
        if (!active) return
        const data = normaliseMetrics(response.data)
        setEntries(data.sort((a, b) => Math.abs(b.value) - Math.abs(a.value)))
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

  const highlight = useMemo(() => entries.slice(0, 4), [entries])
  const others = useMemo(() => entries.slice(4), [entries])

  return (
    <Container>
      <PageHeader title="Dashboard" subtitle="Overview of key commerce KPIs" />
      {loading && <Loading lines={3} />}
      {error && <ErrorState message={error} />}
      {!loading && !error && entries.length === 0 && <EmptyState message="No metrics available yet" />}

      {!loading && !error && entries.length > 0 && (
        <Stack spacing={4}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            {highlight.map((item) => (
              <Card key={item.key} sx={{ flex: 1, minWidth: 0 }}>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">
                    {item.label}
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>
                    {formatMetricValue(item.key, item.value)}
                  </Typography>
                  {typeof item.delta === 'number' && item.delta !== 0 && (
                    <Typography variant="body2" color={item.delta > 0 ? 'success.main' : 'error.main'} sx={{ mt: 1 }}>
                      {item.delta > 0 ? '▲' : '▼'} {formatDelta(item.delta)} vs previous
                    </Typography>
                  )}
                </CardContent>
              </Card>
            ))}
          </Stack>

          {others.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Additional Signals
                </Typography>
                <Stack spacing={2} divider={<Divider flexItem />}>
                  {others.map((item) => (
                    <Stack key={item.key} spacing={1}>
                      <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                        <Typography fontWeight={600}>{item.label}</Typography>
                        <Typography>{formatMetricValue(item.key, item.value)}</Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={Math.max(4, Math.min(100, Math.abs(item.value)))}
                        sx={{ opacity: 0.75 }}
                      />
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}
        </Stack>
      )}
    </Container>
  )
}
