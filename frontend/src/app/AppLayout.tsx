import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined'
import { Link, Outlet, useLocation } from 'react-router'

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/' },
  { label: 'Employees', path: '/employees' },
]

function activeTab(pathname: string): string {
  return pathname.startsWith('/employees') ? '/employees' : '/'
}

export function AppLayout() {
  const { pathname } = useLocation()
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PaymentsOutlined color="primary" />
            <Typography variant="h6" component="span" sx={{ whiteSpace: 'nowrap' }}>
              ACME Salary Manager
            </Typography>
          </Box>
          <Tabs value={activeTab(pathname)} component="nav" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => (
              <Tab key={item.path} label={item.label} value={item.path} component={Link} to={item.path} />
            ))}
          </Tabs>
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" component="main" sx={{ py: 3 }}>
        <Outlet />
      </Container>
    </Box>
  )
}
