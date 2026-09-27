import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { BarChart } from '@mui/x-charts/BarChart'
import type { DepartmentPayroll, SalaryBand } from '../../api/types'
import { formatMoney } from '../../lib/money'
import { EmptyState } from '../../components/QueryState'

const CHART_HEIGHT = 320

export function DepartmentPayChart({ rows, currency }: { rows: DepartmentPayroll[]; currency: string }) {
  const data = rows.filter((row) => row.currency === currency)
  const money = (value: number | null) => (value === null ? '' : formatMoney(value, currency, { compact: true }))
  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" component="h2">
        Pay by department ({currency})
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Median and average annual salary
      </Typography>
      {data.length === 0 ? (
        <EmptyState title="No data for this selection" />
      ) : (
        <BarChart
          height={CHART_HEIGHT}
          xAxis={[{ scaleType: 'band', data: data.map((row) => row.department) }]}
          yAxis={[{ valueFormatter: money, width: 70 }]}
          series={[
            { label: 'Median', data: data.map((row) => row.median_minor), valueFormatter: money },
            { label: 'Average', data: data.map((row) => row.average_minor), valueFormatter: money },
          ]}
        />
      )}
    </Paper>
  )
}

export function SalaryBandChart({ bands, currency }: { bands: SalaryBand[]; currency: string }) {
  const data = bands.filter((band) => band.currency === currency)
  const labels = data.map(
    (band) =>
      `${formatMoney(band.lower_minor, currency, { compact: true })}–${formatMoney(band.upper_minor, currency, { compact: true })}`,
  )
  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" component="h2">
        Salary distribution ({currency})
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Employees per annual salary band
      </Typography>
      {data.length === 0 ? (
        <EmptyState title="No data for this selection" />
      ) : (
        <BarChart
          height={CHART_HEIGHT}
          xAxis={[{ scaleType: 'band', data: labels, tickLabelStyle: { fontSize: 11 } }]}
          series={[{ label: 'Employees', data: data.map((band) => band.employee_count), color: '#0f766e' }]}
          hideLegend
        />
      )}
    </Paper>
  )
}
