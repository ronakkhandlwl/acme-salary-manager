import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import type { ChangeReason } from '../../api/types'
import { CHANGE_REASON_LABELS, PAY_FREQUENCY_LABELS } from '../../lib/labels'
import { SUPPORTED_CURRENCIES } from '../../lib/money'
import type { SalaryFormErrors, SalaryFormValues } from './salaryForm'

interface Props {
  values: SalaryFormValues
  errors: SalaryFormErrors
  onChange: (values: SalaryFormValues) => void
  reasons?: ChangeReason[]
}

export function SalaryFields({ values, errors, onChange, reasons }: Props) {
  const set = (key: keyof SalaryFormValues) => (event: { target: { value: string } }) =>
    onChange({ ...values, [key]: event.target.value })
  const reasonOptions = reasons ?? (Object.keys(CHANGE_REASON_LABELS) as ChangeReason[])

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 8 }}>
        <TextField
          fullWidth
          required
          label="Amount"
          value={values.amount}
          onChange={set('amount')}
          error={Boolean(errors.amount)}
          helperText={errors.amount ?? 'In major units, e.g. 95000 or 95,000.50'}
          slotProps={{ htmlInput: { inputMode: 'decimal' } }}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField
          fullWidth
          select
          required
          label="Currency"
          value={values.currency}
          onChange={set('currency')}
          error={Boolean(errors.currency)}
          helperText={errors.currency}
        >
          {SUPPORTED_CURRENCIES.map((currency) => (
            <MenuItem key={currency} value={currency}>
              {currency}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField fullWidth select label="Pay frequency" value={values.payFrequency} onChange={set('payFrequency')}>
          {Object.entries(PAY_FREQUENCY_LABELS).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField
          fullWidth
          required
          type="date"
          label="Effective from"
          value={values.effectiveFrom}
          onChange={set('effectiveFrom')}
          error={Boolean(errors.effectiveFrom)}
          helperText={errors.effectiveFrom}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField fullWidth select label="Reason" value={values.changeReason} onChange={set('changeReason')}>
          {reasonOptions.map((reason) => (
            <MenuItem key={reason} value={reason}>
              {CHANGE_REASON_LABELS[reason]}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
    </Grid>
  )
}
