import { Stack, Typography, Box } from '@mui/material'

interface PageHeaderProps {
  title: string
  subtitle?: React.ReactNode
  actions?: React.ReactNode
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" sx={{ mb: 2, gap: 1.5 }}>
      <Stack spacing={0.5}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography color="text.secondary" variant="body2">
            {subtitle}
          </Typography>
        )}
      </Stack>
      {actions && <Box>{actions}</Box>}
    </Stack>
  )
}
