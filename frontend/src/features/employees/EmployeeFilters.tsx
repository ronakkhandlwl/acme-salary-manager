import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import { useEffect, useState } from 'react'
import type { EmploymentStatus } from '../../api/types'
import { countryName, STATUS_LABELS } from '../../lib/labels'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import { useFilterOptions } from './queries'

export interface EmployeeFilterValues {
  search?: string
  countryCode?: string
  department?: string
  employmentStatus?: EmploymentStatus
}

interface Props {
  values: EmployeeFilterValues
  onChange: (values: EmployeeFilterValues) => void
}

const ALL = ''

export function EmployeeFilters({ values, onChange }: Props) {
  const { data: options } = useFilterOptions()
  const [searchText, setSearchText] = useState(values.search ?? '')
  const debouncedSearch = useDebouncedValue(searchText)

  useEffect(() => {
    if ((debouncedSearch || undefined) !== values.search) {
      onChange({ ...values, search: debouncedSearch || undefined })
    }
    // Only react to the user's typing, not to other filter changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const select = (key: keyof EmployeeFilterValues) => (event: { target: { value: string } }) =>
    onChange({ ...values, [key]: event.target.value || undefined })

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
      <TextField
        label="Search"
        placeholder="Name, email or employee number"
        value={searchText}
        onChange={(event) => setSearchText(event.target.value)}
        sx={{ flex: 2 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchOutlined fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />
      <TextField select label="Country" value={values.countryCode ?? ALL} onChange={select('countryCode')} sx={{ flex: 1 }}>
        <MenuItem value={ALL}>All countries</MenuItem>
        {options?.countries.map((code) => (
          <MenuItem key={code} value={code}>
            {countryName(code)}
          </MenuItem>
        ))}
      </TextField>
      <TextField select label="Department" value={values.department ?? ALL} onChange={select('department')} sx={{ flex: 1 }}>
        <MenuItem value={ALL}>All departments</MenuItem>
        {options?.departments.map((department) => (
          <MenuItem key={department} value={department}>
            {department}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="Status"
        value={values.employmentStatus ?? ALL}
        onChange={select('employmentStatus')}
        sx={{ flex: 1 }}
      >
        <MenuItem value={ALL}>Any status</MenuItem>
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <MenuItem key={value} value={value}>
            {label}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  )
}
