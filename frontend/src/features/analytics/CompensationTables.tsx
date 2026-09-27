import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import { Link } from 'react-router'
import type { CountryPayroll, CurrencyExtremes, EmployeeCompensation, RecentSalaryChange } from '../../api/types'
import { EmptyState } from '../../components/QueryState'
import { CHANGE_REASON_LABELS, countryName, formatDate } from '../../lib/labels'
import { annualize, formatMoney } from '../../lib/money'

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Paper sx={{ height: '100%' }}>
      <Box sx={{ p: 2, pb: 1 }}>
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      {children}
    </Paper>
  )
}

export function CountryTable({ rows }: { rows: CountryPayroll[] }) {
  return (
    <Section title="By country" subtitle="Annual payroll stays in each country's pay currency">
      <TableContainer>
        <Table size="small" aria-label="Pay by country">
          <TableHead>
            <TableRow>
              <TableCell>Country</TableCell>
              <TableCell align="right">Headcount</TableCell>
              <TableCell align="right">Payroll</TableCell>
              <TableCell align="right">Median</TableCell>
              <TableCell align="right">Average</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={`${row.country_code}-${row.currency}`}>
                <TableCell>
                  {countryName(row.country_code)} <Typography component="span" color="text.secondary">({row.currency})</Typography>
                </TableCell>
                <TableCell align="right">{row.employee_count.toLocaleString('en')}</TableCell>
                <TableCell align="right">{formatMoney(row.payroll_minor, row.currency, { compact: true })}</TableCell>
                <TableCell align="right">{formatMoney(row.median_minor, row.currency, { wholeUnits: true })}</TableCell>
                <TableCell align="right">{formatMoney(row.average_minor, row.currency, { wholeUnits: true })}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {rows.length === 0 && <EmptyState title="No employees match these filters" />}
    </Section>
  )
}

function PeopleList({ people, label }: { people: EmployeeCompensation[]; label: string }) {
  return (
    <Table size="small" aria-label={label}>
      <TableBody>
        {people.map((person) => (
          <TableRow key={person.id}>
            <TableCell>
              <Link to={`/employees/${person.id}`}>
                {person.first_name} {person.last_name}
              </Link>
              <Typography variant="body2" color="text.secondary">
                {person.department} · {countryName(person.country_code)}
              </Typography>
            </TableCell>
            <TableCell align="right">{formatMoney(person.annual_minor, person.currency)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function ExtremesTable({ extremes, currency }: { extremes: CurrencyExtremes[]; currency: string }) {
  const group = extremes.find((item) => item.currency === currency)
  return (
    <Section title={`Highest and lowest paid (${currency})`} subtitle="Current annual salary, within the filters above">
      {group ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1, px: 1, pb: 1 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ px: 1 }}>Highest</Typography>
            <PeopleList people={group.highest} label={`Highest paid in ${currency}`} />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ px: 1 }}>Lowest</Typography>
            <PeopleList people={group.lowest} label={`Lowest paid in ${currency}`} />
          </Box>
        </Box>
      ) : (
        <EmptyState title="No data for this selection" />
      )}
    </Section>
  )
}

export function RecentChangesTable({ changes }: { changes: RecentSalaryChange[] }) {
  return (
    <Section title="Recent salary changes" subtitle="Most recently recorded entries">
      <TableContainer>
        <Table size="small" aria-label="Recent salary changes">
          <TableHead>
            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell>Effective</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell align="right">Annual salary</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {changes.map((change, index) => (
              <TableRow key={`${change.employee_id}-${change.effective_from}-${index}`}>
                <TableCell>
                  <Link to={`/employees/${change.employee_id}`}>
                    {change.first_name} {change.last_name}
                  </Link>
                </TableCell>
                <TableCell>{formatDate(change.effective_from)}</TableCell>
                <TableCell>{CHANGE_REASON_LABELS[change.change_reason] ?? change.change_reason}</TableCell>
                <TableCell align="right">
                  {formatMoney(annualize(change.amount_minor, change.pay_frequency), change.currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {changes.length === 0 && <EmptyState title="No salary changes recorded" />}
    </Section>
  )
}
