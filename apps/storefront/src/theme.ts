import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    secondary: { main: '#ff6f61' },
    background: { default: '#f6f8fc', paper: '#ffffff' },
    text: { primary: '#1f2937', secondary: '#4b5563' }
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
    h3: { fontWeight: 800, letterSpacing: '-0.5px' },
    h4: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 }
  },
  components: {
    MuiAppBar: { styleOverrides: { root: { boxShadow: 'none', borderBottom: '1px solid #e5e7eb' } } },
    MuiButton: {
      defaultProps: { variant: 'contained' },
      styleOverrides: { root: { borderRadius: 999, paddingInline: 20 } }
    },
    MuiCard: { styleOverrides: { root: { borderRadius: 16, boxShadow: '0 8px 30px rgba(15, 23, 42, 0.08)' } } }
  }
})

export default theme
