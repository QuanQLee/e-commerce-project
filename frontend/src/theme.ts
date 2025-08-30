import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#3f51b5' },
    secondary: { main: '#ff6f61' },
    background: { default: '#f7f8fa', paper: '#ffffff' },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'].join(','),
    h4: { fontWeight: 700 },
  },
  components: {
    MuiButton: {
      defaultProps: { variant: 'contained' },
    },
    MuiAppBar: {
      styleOverrides: { root: { boxShadow: 'none', borderBottom: '1px solid #eee' } },
    },
    MuiCard: {
      styleOverrides: { root: { borderRadius: 14 } },
    },
  },
})

export default theme

