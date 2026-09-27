import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import LinearProgress from '@mui/material/LinearProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import TableSortLabel from '@mui/material/TableSortLabel'
import Typography from '@mui/material/Typography'
import PersonAddOutlined from '@mui/icons-material/PersonAddOutlined'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import type { Employee, EmployeeQuery, SortField } from '../../api/types'
import { EmptyState, ErrorState, LoadingState } from '../../components/QueryState'
import { StatusChip } from '../../components/StatusChip'
import { annualize, formatMoney } from '../../lib/money'
import { countryName, formatDate } from '../../lib/labels'
import { AddEmployeeDialog } from './AddEmployeeDialog'
import { PAGE_SIZES, readDirectoryQuery, writeDirectoryQuery } from './directorySearchParams'
import { EmployeeFilters, type EmployeeFilterValues } from './EmployeeFilters'
import { useEmployeeList } from './queries'

const COLUMNS: { label: string; sortField?: SortField; align?: 'right' }[] = [
  { label: 'Employee', sortField: 'last_name' },
  { label: 'Number', sortField: 'employee_number' },
  { label: 'Department', sortField: 'department' },
  { label: 'Country', sortField: 'country_code' },
  { label: 'Status' },
  { label: 'Hire date', sortField: 'hire_date' },
  { label: 'Annual salary', align: 'right' },
]

function SalaryCell({ employee }: { employee: Employee }) {
  const salary = employee.current_salary
  if (!salary) return <Typography color="text.secondary">—</Typography>
  return <>{formatMoney(annualize(salary.amount_minor, salary.pay_frequency), salary.currency)}</>
}

export function EmployeeDirectoryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [addOpen, setAddOpen] = useState(false)
  const query = readDirectoryQuery(searchParams)
  const { data, error, isPending, isFetching, refetch } = useEmployeeList(query)

  const update = (changes: Partial<EmployeeQuery>) =>
    setSearchParams(writeDirectoryQuery({ ...query, ...changes }), { replace: true })

  const onFilterChange = (filters: EmployeeFilterValues) => update({ ...filters, page: 1 })

  const onSort = (field: SortField) =>
    update({
      sortBy: field,
      sortDirection: query.sortBy === field && query.sortDirection === 'asc' ? 'desc' : 'asc',
      page: 1,
    })

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1">
            Employees
          </Typography>
          <Typography color="text.secondary">
            {data ? `${data.total.toLocaleString('en')} matching employees` : 'Search the workforce'}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<PersonAddOutlined />} onClick={() => setAddOpen(true)}>
          Add employee
        </Button>
      </Stack>

      <EmployeeFilters
        values={{
          search: query.search,
          countryCode: query.countryCode,
          department: query.department,
          employmentStatus: query.employmentStatus,
        }}
        onChange={onFilterChange}
      />

      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isPending ? (
        <LoadingState label="Loading employees…" />
      ) : (
        <Paper>
          {isFetching && <LinearProgress aria-label="Refreshing results" />}
          <TableContainer>
            <Table size="small" aria-label="Employee directory">
              <TableHead>
                <TableRow>
                  {COLUMNS.map((column) => (
                    <TableCell
                      key={column.label}
                      align={column.align}
                      sortDirection={query.sortBy === column.sortField ? query.sortDirection : false}
                    >
                      {column.sortField ? (
                        <TableSortLabel
                          active={query.sortBy === column.sortField}
                          direction={query.sortBy === column.sortField ? query.sortDirection : 'asc'}
                          onClick={() => onSort(column.sortField!)}
                        >
                          {column.label}
                        </TableSortLabel>
                      ) : (
                        column.label
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((employee) => (
                  <TableRow
                    key={employee.id}
                    hover
                    onClick={() => navigate(`/employees/${employee.id}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Link to={`/employees/${employee.id}`} onClick={(event) => event.stopPropagation()}>
                        {employee.first_name} {employee.last_name}
                      </Link>
                      <Typography variant="body2" color="text.secondary">
                        {employee.title}
                      </Typography>
                    </TableCell>
                    <TableCell>{employee.employee_number}</TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>{countryName(employee.country_code)}</TableCell>
                    <TableCell>
                      <StatusChip status={employee.employment_status} />
                    </TableCell>
                    <TableCell>{formatDate(employee.hire_date)}</TableCell>
                    <TableCell align="right">
                      <SalaryCell employee={employee} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {data.items.length === 0 && (
            <EmptyState title="No employees match these filters">Try a different search or clear a filter.</EmptyState>
          )}
          <TablePagination
            component="div"
            count={data.total}
            page={query.page - 1}
            rowsPerPage={query.pageSize}
            rowsPerPageOptions={[...PAGE_SIZES]}
            onPageChange={(_, page) => update({ page: page + 1 })}
            onRowsPerPageChange={(event) => update({ pageSize: Number(event.target.value), page: 1 })}
          />
        </Paper>
      )}
      <AddEmployeeDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(employee) => navigate(`/employees/${employee.id}`)}
      />
    </Stack>
  )
}
