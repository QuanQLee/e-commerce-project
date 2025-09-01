import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    secondary: { main: '#ff6f61' },
    background: { default: '#f7f8fb', paper: '#fff' },
  },
  shape: { borderRadius: 12 },
  typography: { h4: { fontWeight: 700 } },
  components: {
    MuiAppBar: { styleOverrides: { root: { boxShadow: 'none', borderBottom: '1px solid #eee' } } },
    MuiCard: { styleOverrides: { root: { borderRadius: 14 } } },
    MuiButton: { defaultProps: { variant: 'contained' } },
  }
})

export default theme

