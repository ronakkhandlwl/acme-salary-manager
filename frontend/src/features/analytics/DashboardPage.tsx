import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { useSearchParams } from 'react-router'
import type { AnalyticsQuery } from '../../api/types'
import { EmptyState, ErrorState, LoadingState } from '../../components/QueryState'
import { formatDate } from '../../lib/labels'
import { readAnalyticsQuery, writeAnalyticsQuery } from './analyticsSearchParams'
import { DepartmentPayChart, SalaryBandChart } from './CompensationCharts'
import { CountryTable, ExtremesTable, RecentChangesTable } from './CompensationTables'
import { chooseCurrency } from './currencySelection'
import { DashboardFilters } from './DashboardFilters'
import { PayrollByCurrency } from './PayrollByCurrency'
import { useAnalyticsSummary } from './queries'

export function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = readAnalyticsQuery(searchParams)
  const { data, error, isPending, isFetching, refetch } = useAnalyticsSummary(query)
  const currency = data ? chooseCurrency(data.payroll_by_currency, searchParams.get('currency')) : null

  const updateQuery = (next: AnalyticsQuery) => {
    const params = writeAnalyticsQuery(next)
    if (currency) params.set('currency', currency)
    setSearchParams(params, { replace: true })
  }
  const selectCurrency = (next: string | null) => {
    if (!next) return
    const params = writeAnalyticsQuery(query)
    params.set('currency', next)
    setSearchParams(params, { replace: true })
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h1">
          Compensation overview
        </Typography>
        <Typography color="text.secondary">
          {data ? `Current pay as of ${formatDate(data.as_of)}` : 'How ACME pays its people'}
        </Typography>
      </Box>
      <DashboardFilters value={query} onChange={updateQuery} />

      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isPending ? (
        <LoadingState label="Calculating compensation…" />
      ) : (
        <>
          {isFetching && <LinearProgress aria-label="Refreshing analytics" />}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' } }}>
            <Paper sx={{ p: 2, minWidth: 180 }}>
              <Typography variant="overline" color="text.secondary">
                Headcount
              </Typography>
              <Typography variant="h4" component="p" data-testid="headcount">
                {data.headcount.toLocaleString('en')}
              </Typography>
            </Paper>
            <Alert severity="info" sx={{ flex: 1 }}>
              {data.annualization_note} Compare currencies using the per-currency figures, not totals.
            </Alert>
          </Stack>

          {data.headcount === 0 ? (
            <EmptyState title="No employees with a salary match these filters" />
          ) : (
            <>
              <PayrollByCurrency groups={data.payroll_by_currency} />
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="subtitle2">Detailed view in</Typography>
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={currency}
                  onChange={(_, next) => selectCurrency(next)}
                  aria-label="Currency for charts"
                >
                  {data.payroll_by_currency.map((group) => (
                    <ToggleButton key={group.currency} value={group.currency}>
                      {group.currency}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Stack>
              {currency && (
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, lg: 7 }}>
                    <DepartmentPayChart rows={data.by_department} currency={currency} />
                  </Grid>
                  <Grid size={{ xs: 12, lg: 5 }}>
                    <SalaryBandChart bands={data.salary_bands} currency={currency} />
                  </Grid>
                  <Grid size={{ xs: 12, lg: 7 }}>
                    <ExtremesTable extremes={data.extremes} currency={currency} />
                  </Grid>
                  <Grid size={{ xs: 12, lg: 5 }}>
                    <CountryTable rows={data.by_country} />
                  </Grid>
                </Grid>
              )}
            </>
          )}
          <RecentChangesTable changes={data.recent_changes} />
        </>
      )}
    </Stack>
  )
}
