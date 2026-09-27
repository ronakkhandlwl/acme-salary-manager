import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'media' },
  colorSchemes: {
    light: { palette: { primary: { main: '#2f5bea' }, secondary: { main: '#0f766e' } } },
    dark: { palette: { primary: { main: '#8aa6ff' }, secondary: { main: '#5eead4' } } },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
    h4: { fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        a: { color: theme.vars.palette.primary.main, textDecoration: 'none', fontWeight: 500 },
        'a:hover': { textDecoration: 'underline' },
      }),
    },
    MuiPaper: { defaultProps: { variant: 'outlined' } },
    MuiTableCell: { styleOverrides: { head: { fontWeight: 600 } } },
  },
})
