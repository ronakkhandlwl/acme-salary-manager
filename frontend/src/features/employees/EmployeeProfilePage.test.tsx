import { screen, within } from '@testing-library/react'
import * as employeesApi from '../../api/employees'
import { ApiError } from '../../api/client'
import { adaDetail } from '../../test/fixtures'
import { renderRoute } from '../../test/render'
import { EmployeeProfilePage } from './EmployeeProfilePage'

describe('EmployeeProfilePage', () => {
  it('shows current pay and the append-only history', async () => {
    vi.spyOn(employeesApi, 'getEmployee').mockResolvedValue({
      ...adaDetail,
      salary_history: [
        adaDetail.current_salary!,
        { ...adaDetail.current_salary!, id: 'sal-1', amount_minor: 80_000_00, effective_from: '2020-01-15', change_reason: 'initial_offer' },
      ],
    })

    renderRoute(<EmployeeProfilePage />, { path: '/staff/:employeeId', url: '/staff/emp-1' })

    expect(await screen.findByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument()
    expect(screen.getByTestId('current-salary')).toHaveTextContent('£90,000')
    const rows = within(screen.getByRole('table', { name: /salary history/i })).getAllByRole('row')
    expect(rows).toHaveLength(3)
    expect(rows[1]).toHaveTextContent(/Current/)
    expect(rows[1]).toHaveTextContent('+12.5%')
    expect(rows[2]).toHaveTextContent('Initial offer')
  })

  it('reports unknown employees', async () => {
    vi.spyOn(employeesApi, 'getEmployee').mockRejectedValue(new ApiError(404, 'employee not found'))
    renderRoute(<EmployeeProfilePage />, { path: '/staff/:employeeId', url: '/staff/missing' })
    expect(await screen.findByText('employee not found')).toBeInTheDocument()
  })
})
