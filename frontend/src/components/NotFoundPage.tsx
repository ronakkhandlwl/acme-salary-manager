import Button from '@mui/material/Button'
import { Link } from 'react-router'
import { EmptyState } from './QueryState'

export function NotFoundPage() {
  return (
    <EmptyState title="Page not found">
      <Button component={Link} to="/" sx={{ mt: 2 }}>
        Back to dashboard
      </Button>
    </EmptyState>
  )
}
