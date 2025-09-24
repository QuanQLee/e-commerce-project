import type { AppProps } from 'next/app'
import { CssBaseline, ThemeProvider } from '@mui/material'
import ErrorBoundary from '../components/ErrorBoundary'
import theme from '../theme'
import { CartProvider } from '../state/cart'
import { I18nProvider } from '../state/i18n'

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <I18nProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <CartProvider>
          <ErrorBoundary>
            <Component {...pageProps} />
          </ErrorBoundary>
        </CartProvider>
      </ThemeProvider>
    </I18nProvider>
  )
}
