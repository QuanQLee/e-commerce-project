import { Stack, Skeleton } from '@mui/material'

export default function Loading({ lines = 3 }: { lines?: number }) {
  return (
    <Stack spacing={2}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={80} />
      ))}
    </Stack>
  )
}

