import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import type { AnalyticsQuery } from '../../api/types'
import { countryName, STATUS_LABELS } from '../../lib/labels'
import { useFilterOptions } from '../employees/queries'

interface Props {
  value: AnalyticsQuery
  onChange: (value: AnalyticsQuery) => void
}

export function DashboardFilters({ value, onChange }: Props) {
  const { data: options } = useFilterOptions()
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <TextField
        select
        label="Country"
        value={value.countryCode ?? ''}
        onChange={(event) => onChange({ ...value, countryCode: event.target.value || undefined })}
        sx={{ minWidth: 200 }}
      >
        <MenuItem value="">All countries</MenuItem>
        {options?.countries.map((code) => (
          <MenuItem key={code} value={code}>
            {countryName(code)}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="Department"
        value={value.department ?? ''}
        onChange={(event) => onChange({ ...value, department: event.target.value || undefined })}
        sx={{ minWidth: 200 }}
      >
        <MenuItem value="">All departments</MenuItem>
        {options?.departments.map((department) => (
          <MenuItem key={department} value={department}>
            {department}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="Employment status"
        value={value.employmentStatus}
        onChange={(event) =>
          onChange({ ...value, employmentStatus: event.target.value as AnalyticsQuery['employmentStatus'] })
        }
        sx={{ minWidth: 200 }}
      >
        {Object.entries(STATUS_LABELS).map(([status, label]) => (
          <MenuItem key={status} value={status}>
            {label}
          </MenuItem>
        ))}
        <MenuItem value="all">All statuses</MenuItem>
      </TextField>
    </Stack>
  )
}
