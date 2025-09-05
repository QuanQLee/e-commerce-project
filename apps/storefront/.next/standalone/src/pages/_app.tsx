import type { AppProps } from 'next/app'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import ErrorBoundary from '../components/ErrorBoundary'

const theme = createTheme({ palette: { mode: 'light' } })

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Component {...pageProps} />
      </ThemeProvider>
    </ErrorBoundary>
  )
}
