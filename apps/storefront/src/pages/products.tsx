import { useEffect, useRef, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Stack,
  Typography,
  Button
} from '@mui/material'
import api from '../lib/api'

type Product = {
  id: string
  name: string
  description?: string
  price: number
  imageUrl?: string
  category?: string
  stock?: number
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    api.get('/api/v1/catalog/products')
      .then(res => { if (!cancelled) setProducts(res.data || []) })
      .catch(err => {
        if (cancelled) return
        const status = err?.response?.status
        if (status === 401) setError('需要登录后才能查看产品，请先登录')
        else setError(err?.response?.data?.message || '加载产品失败')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handleCardClick = (id: string, isActive: boolean) => {
    if (isActive) { setActiveId(null); return }
    setActiveId(id)
    requestAnimationFrame(() => {
      const el = itemRefs.current[id]
      el?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    })
  }

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Products</Typography>
          <Typography color="text.secondary">Click a card to focus and reveal details</Typography>
        </Box>
        <Button variant="outlined" onClick={() => setActiveId(null)} disabled={activeId === null}>Reset</Button>
      </Stack>

      {loading && (
        <Typography color="text.secondary">正在加载产品...</Typography>
      )}
      {!loading && error && (
        <Box sx={{ p: 2, borderRadius: 2, border: '1px solid rgba(255,0,0,0.2)', bgcolor: 'rgba(255,0,0,0.06)' }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      {!loading && !error && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gap: 3,
          }}
        >
          {products.map((p, idx) => {
            const active = activeId === p.id
            const dimmed = activeId !== null && !active
            return (
              <Card
                key={p.id}
                ref={(el) => { itemRefs.current[p.id] = el }}
                onClick={() => handleCardClick(p.id, active)}
                sx={{
                  position: 'relative',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  height: { xs: 280, sm: 320 },
                  borderRadius: 3,
                  boxShadow: active ? '0 16px 50px rgba(0,0,0,0.25)' : '0 6px 24px rgba(0,0,0,0.12)',
                  transform: active ? 'translateY(-4px) scale(1.03)' : `translateY(${(idx % 3) - 1}px) scale(0.98)`,
                  transition: 'transform 300ms ease, box-shadow 300ms ease, filter 300ms ease, opacity 300ms ease',
                  zIndex: active ? 2 : 1,
                  filter: dimmed ? 'blur(1px) saturate(0.8)' : 'none',
                  opacity: dimmed ? 0.7 : 1,
                  scrollMarginTop: 96,
                  '&:hover': { transform: active ? 'translateY(-6px) scale(1.035)' : 'translateY(-2px) scale(1.01)' }
                }}
              >
                {/* Background image */}
                <Box
                  component="img"
                  alt={p.name}
                  src={p.imageUrl || 'https://via.placeholder.com/800x600?text=No+Image'}
                  loading="lazy"
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: active ? 'scale(1.06)' : 'scale(1.02)',
                    transition: 'transform 500ms ease',
                    filter: active ? 'none' : 'grayscale(10%)'
                  }}
                />

                {/* Subtle vignette */}
                <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 20%, rgba(0,0,0,0.55) 100%)' }} />

                {/* Top-left tag (use category as a tag) */}
                {!!p.category && (
                  <Chip
                    label={p.category}
                    color={active ? 'primary' : 'default'}
                    size="small"
                    sx={{ position: 'absolute', top: 12, left: 12, bgcolor: active ? 'primary.main' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(6px)' }}
                  />
                )}

                {/* Bottom info panel */}
                <CardContent
                  sx={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    color: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    p: 2.2
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="end">
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>{p.name}</Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>${p.price}</Typography>
                    </Box>
                    <Button size="small" variant="contained" color="secondary" onClick={(e) => { e.stopPropagation(); /* TODO: add to cart */ }}>
                      Add to cart
                    </Button>
                  </Stack>

                  {/* Expanded details when active */}
                  <Box
                    sx={{
                      maxHeight: active ? 200 : 0,
                      overflow: 'hidden',
                      transition: 'max-height 300ms ease',
                    }}
                  >
                    <Typography variant="body2" sx={{ mt: 1, color: 'rgba(255,255,255,0.92)' }}>
                      {p.description}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1.2 }}>
                      <Chip size="small" label="Free shipping" sx={{ bgcolor: 'rgba(255,255,255,0.14)', color: 'white' }} />
                      <Chip size="small" label="30‑day returns" sx={{ bgcolor: 'rgba(255,255,255,0.14)', color: 'white' }} />
                    </Stack>
                  </Box>
                </CardContent>
              </Card>
            )
          })}
        </Box>
      )}
    </Container>
  )
}
