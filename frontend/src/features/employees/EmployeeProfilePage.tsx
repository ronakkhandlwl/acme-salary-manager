import Box from '@mui/material/Box'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import EditOutlined from '@mui/icons-material/EditOutlined'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import type { EmployeeDetail } from '../../api/types'
import { EmptyState, ErrorState, LoadingState } from '../../components/QueryState'
import { StatusChip } from '../../components/StatusChip'
import { CHANGE_REASON_LABELS, countryName, formatDate, PAY_FREQUENCY_LABELS } from '../../lib/labels'
import { annualize, formatMoney } from '../../lib/money'
import { useEmployee } from './queries'
import { SalaryChangeDialog } from './SalaryChangeDialog'
import { buildSalaryHistory } from './salaryHistory'

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography>{value}</Typography>
    </Box>
  )
}

function CurrentSalaryCard({ employee }: { employee: EmployeeDetail }) {
  const salary = employee.current_salary
  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Typography variant="overline" color="text.secondary">
        Current annual salary
      </Typography>
      {salary ? (
        <>
          <Typography variant="h4" component="p" data-testid="current-salary">
            {formatMoney(annualize(salary.amount_minor, salary.pay_frequency), salary.currency)}
          </Typography>
          <Typography color="text.secondary">
            {formatMoney(salary.amount_minor, salary.currency)} {PAY_FREQUENCY_LABELS[salary.pay_frequency].toLowerCase()}
            {' · '}effective {formatDate(salary.effective_from)}
          </Typography>
        </>
      ) : (
        <Typography color="text.secondary">No salary in effect yet</Typography>
      )}
    </Paper>
  )
}

function SalaryHistoryTable({ employee }: { employee: EmployeeDetail }) {
  const rows = buildSalaryHistory(employee.salary_history, employee.current_salary?.id)
  if (rows.length === 0) return <EmptyState title="No salary history yet" />
  return (
    <TableContainer>
      <Table size="small" aria-label="Salary history">
        <TableHead>
          <TableRow>
            <TableCell>Effective from</TableCell>
            <TableCell align="right">Amount</TableCell>
            <TableCell>Frequency</TableCell>
            <TableCell align="right">Annualized</TableCell>
            <TableCell align="right">Change</TableCell>
            <TableCell>Reason</TableCell>
            <TableCell>Recorded</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(({ record, annualMinor, changePercent, status }) => (
            <TableRow key={record.id} selected={status === 'current'}>
              <TableCell>
                {formatDate(record.effective_from)}{' '}
                {status !== 'past' && (
                  <Chip size="small" label={status === 'current' ? 'Current' : 'Scheduled'} color={status === 'current' ? 'primary' : 'default'} />
                )}
              </TableCell>
              <TableCell align="right">{formatMoney(record.amount_minor, record.currency)}</TableCell>
              <TableCell>{PAY_FREQUENCY_LABELS[record.pay_frequency]}</TableCell>
              <TableCell align="right">{formatMoney(annualMinor, record.currency)}</TableCell>
              <TableCell align="right" sx={{ color: changePercent !== null && changePercent < 0 ? 'error.main' : undefined }}>
                {changePercent === null ? '—' : `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%`}
              </TableCell>
              <TableCell>{CHANGE_REASON_LABELS[record.change_reason] ?? record.change_reason}</TableCell>
              <TableCell>{record.created_at ? formatDate(record.created_at) : '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export function EmployeeProfilePage() {
  const { employeeId = '' } = useParams()
  const { data: employee, error, isPending, refetch } = useEmployee(employeeId)
  const [dialogOpen, setDialogOpen] = useState(false)

  if (isPending) return <LoadingState label="Loading employee…" />
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />

  return (
    <Stack spacing={3}>
      <Breadcrumbs aria-label="Breadcrumb">
        <Link to="/employees">Employees</Link>
        <Typography color="text.primary">
          {employee.first_name} {employee.last_name}
        </Typography>
      </Breadcrumbs>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between' }}>
        <Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="h4" component="h1">
              {employee.first_name} {employee.last_name}
            </Typography>
            <StatusChip status={employee.employment_status} />
          </Stack>
          <Typography color="text.secondary">
            {employee.title} · {employee.department}
          </Typography>
        </Box>
        <Box>
          <Button variant="contained" startIcon={<EditOutlined />} onClick={() => setDialogOpen(true)}>
            Record salary change
          </Button>
        </Box>
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Grid container spacing={2}>
              <Grid size={6}><Detail label="Employee number" value={employee.employee_number} /></Grid>
              <Grid size={6}><Detail label="Email" value={employee.email} /></Grid>
              <Grid size={6}><Detail label="Country" value={countryName(employee.country_code)} /></Grid>
              <Grid size={6}><Detail label="Hire date" value={formatDate(employee.hire_date)} /></Grid>
            </Grid>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <CurrentSalaryCard employee={employee} />
        </Grid>
      </Grid>

      <Paper>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" component="h2">
            Salary history
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Append-only: corrections are recorded as new entries so the audit trail is preserved.
          </Typography>
        </Box>
        <SalaryHistoryTable employee={employee} />
      </Paper>

      <SalaryChangeDialog key={employee.id} employee={employee} open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </Stack>
  )
}
