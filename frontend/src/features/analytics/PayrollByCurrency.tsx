import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { MoneyGroup } from '../../api/types'
import { formatMoney } from '../../lib/money'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Stack>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body1" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
    </Stack>
  )
}

export function PayrollByCurrency({ groups }: { groups: MoneyGroup[] }) {
  return (
    <Grid container spacing={2}>
      {groups.map((group) => (
        <Grid key={group.currency} size={{ xs: 12, sm: 6, lg: 12 / Math.min(Math.max(groups.length, 1), 5) }}>
          <Paper sx={{ p: 2 }} aria-label={`${group.currency} payroll`}>
            <Typography variant="overline" color="text.secondary">
              {group.currency} · {group.employee_count.toLocaleString('en')} employees
            </Typography>
            <Typography variant="h5" component="p">
              {formatMoney(group.payroll_minor, group.currency, { compact: true })}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              annual payroll
            </Typography>
            <Stack direction="row" spacing={3}>
              <Stat label="Median" value={formatMoney(group.median_minor, group.currency, { compact: true })} />
              <Stat label="Average" value={formatMoney(group.average_minor, group.currency, { compact: true })} />
            </Stack>
          </Paper>
        </Grid>
      ))}
    </Grid>
  )
}
