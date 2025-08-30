import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { Snackbar, Alert } from '@mui/material'
import type { AlertColor } from '@mui/material'
import { setApiErrorHandler } from '../api/api'

type ToastFn = (message: string, severity?: AlertColor) => void

const SnackbarContext = createContext<{ toast: ToastFn; success: ToastFn; error: ToastFn } | null>(null)

export function useSnackbar() {
  const ctx = useContext(SnackbarContext)
  if (!ctx) throw new Error('useSnackbar must be used within SnackbarProvider')
  return ctx
}

export default function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [severity, setSeverity] = useState<AlertColor>('info')

  const toast: ToastFn = useCallback((msg: string, sev: AlertColor = 'info') => {
    setMessage(msg)
    setSeverity(sev)
    setOpen(true)
  }, [])

  const success: ToastFn = useCallback((msg: string) => toast(msg, 'success'), [toast])
  const error: ToastFn = useCallback((msg: string) => toast(msg, 'error'), [toast])

  // Wire API global error handler
  useMemo(() => {
    setApiErrorHandler((msg) => error(msg))
  }, [error])

  const value = useMemo(() => ({ toast, success, error }), [toast, success, error])

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <Snackbar open={open} autoHideDuration={3000} onClose={() => setOpen(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setOpen(false)} severity={severity} variant="filled" sx={{ width: '100%' }}>
          {message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  )
}
