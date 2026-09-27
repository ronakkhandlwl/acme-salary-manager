import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import { useState } from 'react'
import type { EmployeeDetail } from '../../api/types'
import { todayIso } from '../../lib/labels'
import { annualize, formatMoney, parseMoneyInput, percentChange } from '../../lib/money'
import { useAddSalaryRecord } from './queries'
import { SalaryFields } from './SalaryFields'
import { type SalaryFormErrors, type SalaryFormValues, validateSalaryForm } from './salaryForm'

interface Props {
  employee: EmployeeDetail
  open: boolean
  onClose: () => void
}

function initialValues(employee: EmployeeDetail): SalaryFormValues {
  return {
    amount: '',
    currency: employee.current_salary?.currency ?? 'USD',
    payFrequency: employee.current_salary?.pay_frequency ?? 'annual',
    effectiveFrom: todayIso(),
    changeReason: 'annual_review',
  }
}

/** Shows how the proposed pay compares with current pay, when comparable. */
function ChangePreview({ employee, values }: { employee: EmployeeDetail; values: SalaryFormValues }) {
  const current = employee.current_salary
  const proposed = parseMoneyInput(values.amount, values.currency)
  if (!current || proposed === null) return null
  if (current.currency !== values.currency) {
    return <Alert severity="warning">Currency changes from {current.currency} to {values.currency}. No conversion is applied.</Alert>
  }
  const before = annualize(current.amount_minor, current.pay_frequency)
  const after = annualize(proposed, values.payFrequency)
  const change = percentChange(before, after)
  return (
    <Alert severity={after < before ? 'warning' : 'info'}>
      Annual pay {formatMoney(before, current.currency)} → {formatMoney(after, current.currency)}
      {change !== null && ` (${change >= 0 ? '+' : ''}${change.toFixed(1)}%)`}
    </Alert>
  )
}

export function SalaryChangeDialog({ employee, open, onClose }: Props) {
  const [values, setValues] = useState(() => initialValues(employee))
  const [errors, setErrors] = useState<SalaryFormErrors>({})
  const mutation = useAddSalaryRecord(employee.id)

  const close = () => {
    setValues(initialValues(employee))
    setErrors({})
    mutation.reset()
    onClose()
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const result = validateSalaryForm(values, { hireDate: employee.hire_date, today: todayIso() })
    setErrors(result.errors)
    if (result.payload) mutation.mutate(result.payload, { onSuccess: close })
  }

  return (
    <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
      <form onSubmit={submit} noValidate aria-label="Record salary change">
        <DialogTitle>
          Record salary change for {employee.first_name} {employee.last_name}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info" variant="outlined">
              A new record is added to the history; previous salaries are never changed.
            </Alert>
            <SalaryFields
              values={values}
              errors={errors}
              onChange={setValues}
              reasons={['annual_review', 'promotion', 'market_adjustment', 'role_change', 'correction']}
            />
            <ChangePreview employee={employee} values={values} />
            {mutation.error && <Alert severity="error">{mutation.error.message}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>Cancel</Button>
          <Button type="submit" variant="contained" loading={mutation.isPending}>
            Save salary change
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
