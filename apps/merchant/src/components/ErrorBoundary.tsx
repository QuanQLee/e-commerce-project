import { Component, type ReactNode } from 'react'
import { Box, Button, Container, Stack, Typography } from '@mui/material'
import { I18nContext } from '../state/i18n'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  static contextType = I18nContext
  declare context: React.ContextType<typeof I18nContext>

  state: State = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('MerchantErrorBoundary', error, info)
  }

  private handleReload = () => {
    this.setState({ hasError: false })
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      const i18n = this.context
      const t = i18n?.t ?? ((key: string) => key)
      return (
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', background: 'linear-gradient(135deg, #eef2ff 0%, #fff 100%)' }}>
          <Container maxWidth="sm">
            <Stack spacing={3} sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ fontWeight: 800 }}>
                {t('errorBoundary.title')}
              </Typography>
              <Typography color="text.secondary">{t('errorBoundary.description')}</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
                <Button size="large" variant="contained" onClick={this.handleReload}>
                  {t('errorBoundary.refresh')}
                </Button>
                <Button size="large" variant="outlined" href="/">
                  {t('errorBoundary.home')}
                </Button>
              </Stack>
            </Stack>
          </Container>
        </Box>
      )
    }

    return this.props.children
  }
}
