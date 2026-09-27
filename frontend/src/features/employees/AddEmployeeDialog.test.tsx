import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as employeesApi from '../../api/employees'
import { adaDetail } from '../../test/fixtures'
import { renderRoute } from '../../test/render'
import { AddEmployeeDialog } from './AddEmployeeDialog'

describe('AddEmployeeDialog', () => {
  it('creates the employee with a starting salary in one request', async () => {
    const createEmployee = vi.spyOn(employeesApi, 'createEmployee').mockResolvedValue(adaDetail)
    const onCreated = vi.fn()
    renderRoute(<AddEmployeeDialog open onClose={vi.fn()} onCreated={onCreated} />)
    const user = userEvent.setup()

    const fields: [RegExp, string][] = [
      [/first name/i, 'Grace'],
      [/last name/i, 'Hopper'],
      [/work email/i, 'grace@acme.example.com'],
      [/employee number/i, 'EMP-20001'],
      [/job title/i, 'Director'],
      [/department/i, 'Engineering'],
      [/country code/i, 'US'],
      [/amount/i, '185000'],
    ]
    for (const [label, value] of fields) await user.type(screen.getByLabelText(label), value)
    await user.click(screen.getByRole('button', { name: /create employee/i }))

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(adaDetail))
    expect(createEmployee).toHaveBeenCalledWith(
      expect.objectContaining({
        first_name: 'Grace',
        employment_status: 'active',
        initial_salary: expect.objectContaining({ amount_minor: 18_500_000, change_reason: 'initial_offer' }),
      }),
    )
  })

  it('validates before calling the API', async () => {
    const createEmployee = vi.spyOn(employeesApi, 'createEmployee')
    renderRoute(<AddEmployeeDialog open onClose={vi.fn()} onCreated={vi.fn()} />)

    await userEvent.setup().click(screen.getByRole('button', { name: /create employee/i }))

    expect(await screen.findByText('First name is required')).toBeInTheDocument()
    expect(createEmployee).not.toHaveBeenCalled()
  })
})
