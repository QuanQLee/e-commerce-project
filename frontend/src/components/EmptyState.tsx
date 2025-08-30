import { Box, Typography } from '@mui/material'
import InventoryIcon from '@mui/icons-material/Inventory2'

export default function EmptyState({ message = 'No data yet.' }: { message?: string }) {
  return (
    <Box sx={{ textAlign: 'center', color: 'text.secondary', py: 6 }}>
      <InventoryIcon sx={{ fontSize: 48, mb: 1, opacity: 0.6 }} />
      <Typography>{message}</Typography>
    </Box>
  )
}

