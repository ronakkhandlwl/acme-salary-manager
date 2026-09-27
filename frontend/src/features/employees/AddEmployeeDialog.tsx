import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import type { Employee } from '../../api/types'
import { todayIso } from '../../lib/labels'
import { useCreateEmployee } from './queries'
import { SalaryFields } from './SalaryFields'
import { type EmployeeErrors, EMPTY_EMPLOYEE, EMPLOYEE_FIELDS, validateEmployee } from './employeeForm'
import { type SalaryFormErrors, type SalaryFormValues, validateSalaryForm } from './salaryForm'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (employee: Employee) => void
}

export function AddEmployeeDialog({ open, onClose, onCreated }: Props) {
  const [employee, setEmployee] = useState(EMPTY_EMPLOYEE)
  const [employeeErrors, setEmployeeErrors] = useState<EmployeeErrors>({})
  const [salary, setSalary] = useState<SalaryFormValues>({
    amount: '',
    currency: 'USD',
    payFrequency: 'annual',
    effectiveFrom: todayIso(),
    changeReason: 'initial_offer',
  })
  const [salaryErrors, setSalaryErrors] = useState<SalaryFormErrors>({})
  const mutation = useCreateEmployee()

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const nextEmployeeErrors = validateEmployee(employee)
    const salaryResult = validateSalaryForm(
      { ...salary, effectiveFrom: salary.effectiveFrom || employee.hire_date },
      { hireDate: employee.hire_date, today: todayIso() },
    )
    setEmployeeErrors(nextEmployeeErrors)
    setSalaryErrors(salaryResult.errors)
    if (Object.keys(nextEmployeeErrors).length || !salaryResult.payload) return
    mutation.mutate(
      { ...employee, employment_status: 'active', initial_salary: salaryResult.payload },
      { onSuccess: (created) => { onClose(); onCreated(created) } },
    )
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={submit} noValidate aria-label="Add employee">
        <DialogTitle>Add employee</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            {EMPLOYEE_FIELDS.map((field) => (
              <Grid key={field.key} size={{ xs: 12, sm: field.sm }}>
                <TextField
                  fullWidth
                  required
                  type={field.type}
                  label={field.label}
                  value={employee[field.key]}
                  onChange={(event) => setEmployee({ ...employee, [field.key]: event.target.value })}
                  error={Boolean(employeeErrors[field.key])}
                  helperText={employeeErrors[field.key]}
                  slotProps={field.type === 'date' ? { inputLabel: { shrink: true } } : undefined}
                />
              </Grid>
            ))}
          </Grid>
          <Divider sx={{ my: 3 }} />
          <Typography variant="subtitle1" gutterBottom>
            Starting salary
          </Typography>
          <SalaryFields values={salary} errors={salaryErrors} onChange={setSalary} reasons={['initial_offer']} />
          {mutation.error && <Alert severity="error" sx={{ mt: 2 }}>{mutation.error.message}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" loading={mutation.isPending}>
            Create employee
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
