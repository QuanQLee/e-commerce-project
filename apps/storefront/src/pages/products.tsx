import { useMemo, useRef, useState } from 'react'
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

type Product = {
  id: number
  name: string
  price: number
  image: string
  tag?: string
  desc?: string
}

export default function Products() {
  const products: Product[] = useMemo(() => [
    { id: 1, name: 'Aurora Lamp', price: 129, image: 'https://images.unsplash.com/photo-1544794570-55fe2e8b4cbf?q=80&w=1600&auto=format&fit=crop', tag: 'New', desc: 'Ambient RGB lamp with touch dimmer.' },
    { id: 2, name: 'Canvas Backpack', price: 89, image: 'https://images.unsplash.com/photo-1512314889357-e157c22f938d?q=80&w=1600&auto=format&fit=crop', tag: 'Hot', desc: 'Everyday carry with 15” laptop sleeve.' },
    { id: 3, name: 'Wireless Headphones', price: 159, image: 'https://images.unsplash.com/photo-1518444134316-6f7f2e0d3c5d?q=80&w=1600&auto=format&fit=crop', desc: 'ANC, 40h battery, quick charge.' },
    { id: 4, name: 'Ceramic Mug', price: 24, image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?q=80&w=1600&auto=format&fit=crop', tag: 'Eco', desc: 'Handmade, dishwasher safe.' },
    { id: 5, name: 'Leather Wallet', price: 59, image: 'https://images.unsplash.com/photo-1518544801976-3e7e6b6cde74?q=80&w=1600&auto=format&fit=crop', desc: 'RFID blocking, 8 card slots.' },
    { id: 6, name: 'Minimal Watch', price: 199, image: 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?q=80&w=1600&auto=format&fit=crop', tag: 'Limited', desc: 'Sapphire glass, 5ATM.' },
    { id: 7, name: 'Succulent Set', price: 39, image: 'https://images.unsplash.com/photo-1459666644539-a9755287d6b0?q=80&w=1600&auto=format&fit=crop', desc: '3-pack low maintenance desk plants.' },
    { id: 8, name: 'Sneakers', price: 129, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1600&auto=format&fit=crop', desc: 'Breathable knit upper, foam sole.' },
  ], [])

  const [activeId, setActiveId] = useState<number | null>(null)
  const itemRefs = useRef<Record<number, HTMLDivElement | null>>({})

  const handleCardClick = (id: number, isActive: boolean) => {
    if (isActive) {
      setActiveId(null)
      return
    }
    setActiveId(id)
    // Smoothly center the clicked card in viewport
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
                '&:hover': {
                  transform: active ? 'translateY(-6px) scale(1.035)' : 'translateY(-2px) scale(1.01)'
                }
              }}
            >
              {/* Background image */}
              <Box
                component="img"
                alt={p.name}
                src={p.image}
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

              {/* Top-left tag */}
              {p.tag && (
                <Chip
                  label={p.tag}
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
                    {p.desc}
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
    </Container>
  )
}
