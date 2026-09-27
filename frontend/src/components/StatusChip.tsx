import Chip from '@mui/material/Chip'
import type { EmploymentStatus } from '../api/types'
import { STATUS_LABELS } from '../lib/labels'

const STATUS_COLORS = { active: 'success', inactive: 'warning', terminated: 'default' } as const

export function StatusChip({ status }: { status: EmploymentStatus }) {
  return <Chip size="small" variant="outlined" color={STATUS_COLORS[status]} label={STATUS_LABELS[status]} />
}
