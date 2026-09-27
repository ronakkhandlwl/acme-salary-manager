import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as employeesApi from '../../api/employees'
import { ApiError } from '../../api/client'
import { adaDetail } from '../../test/fixtures'
import { renderRoute } from '../../test/render'
import { SalaryChangeDialog } from './SalaryChangeDialog'

function renderDialog(onClose = vi.fn()) {
  renderRoute(<SalaryChangeDialog employee={adaDetail} open onClose={onClose} />)
  return { onClose, user: userEvent.setup() }
}

describe('SalaryChangeDialog', () => {
  it('previews the change against current annual pay', async () => {
    const { user } = renderDialog()

    await user.type(screen.getByLabelText(/amount/i), '99,000')

    expect(screen.getByText(/£90,000 → £99,000 \(\+10\.0%\)/)).toBeInTheDocument()
  })

  it('submits the amount in minor units and closes on success', async () => {
    const addSalaryRecord = vi.spyOn(employeesApi, 'addSalaryRecord').mockResolvedValue({
      ...adaDetail.current_salary!,
      id: 'sal-3',
    })
    const { user, onClose } = renderDialog()

    await user.type(screen.getByLabelText(/amount/i), '99000.50')
    await user.click(screen.getByRole('button', { name: /save salary change/i }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(addSalaryRecord).toHaveBeenCalledWith(
      'emp-1',
      expect.objectContaining({ amount_minor: 9_900_050, currency: 'GBP', change_reason: 'annual_review' }),
    )
  })

  it('blocks invalid input without calling the API', async () => {
    const addSalaryRecord = vi.spyOn(employeesApi, 'addSalaryRecord')
    const { user } = renderDialog()

    await user.type(screen.getByLabelText(/amount/i), 'abc')
    await user.click(screen.getByRole('button', { name: /save salary change/i }))

    expect(await screen.findByText(/enter a positive amount/i)).toBeInTheDocument()
    expect(addSalaryRecord).not.toHaveBeenCalled()
  })

  it('shows server-side rule violations and stays open', async () => {
    vi.spyOn(employeesApi, 'addSalaryRecord').mockRejectedValue(
      new ApiError(422, 'salary effective date cannot be before the employee hire date'),
    )
    const { user, onClose } = renderDialog()

    await user.type(screen.getByLabelText(/amount/i), '95000')
    await user.click(screen.getByRole('button', { name: /save salary change/i }))

    expect(await screen.findByText(/cannot be before the employee hire date/i)).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })
})
