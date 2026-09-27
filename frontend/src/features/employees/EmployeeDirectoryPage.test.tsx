import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as analyticsApi from '../../api/analytics'
import * as employeesApi from '../../api/employees'
import { employeePage } from '../../test/fixtures'
import { renderRoute } from '../../test/render'
import { EmployeeDirectoryPage } from './EmployeeDirectoryPage'

beforeEach(() => {
  vi.spyOn(analyticsApi, 'getFilterOptions').mockResolvedValue({ countries: ['GB', 'IN'], departments: ['Engineering'] })
})

describe('EmployeeDirectoryPage', () => {
  it('reads filters from the URL and shows annualized current salary', async () => {
    const listEmployees = vi.spyOn(employeesApi, 'listEmployees').mockResolvedValue(employeePage)

    renderRoute(<EmployeeDirectoryPage />, { path: '/employees', url: '/employees?country=GB&page=2' })

    expect(await screen.findByRole('link', { name: 'Ada Lovelace' })).toBeInTheDocument()
    expect(screen.getByText('£90,000')).toBeInTheDocument()
    expect(listEmployees).toHaveBeenCalledWith(expect.objectContaining({ countryCode: 'GB', page: 2 }))
  })

  it('debounces search, resets to page 1 and records it in the URL', async () => {
    const listEmployees = vi.spyOn(employeesApi, 'listEmployees').mockResolvedValue(employeePage)
    const { router } = renderRoute(<EmployeeDirectoryPage />, { path: '/employees', url: '/employees?page=4' })
    const user = userEvent.setup()

    await user.type(await screen.findByRole('textbox', { name: /search/i }), 'lovelace')

    await waitFor(() => expect(router.state.location.search).toBe('?q=lovelace'))
    await waitFor(() =>
      expect(listEmployees).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'lovelace', page: 1 })),
    )
    const searchedCalls = listEmployees.mock.calls.filter(([query]) => query.search)
    expect(searchedCalls).toHaveLength(1) // one request for the whole word, not per keystroke
  })

  it('toggles sort direction from the column header', async () => {
    vi.spyOn(employeesApi, 'listEmployees').mockResolvedValue(employeePage)
    const { router } = renderRoute(<EmployeeDirectoryPage />, { path: '/employees', url: '/employees' })
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Hire date' }))
    expect(router.state.location.search).toBe('?sort=hire_date')
    await user.click(screen.getByRole('button', { name: 'Hire date' }))
    expect(router.state.location.search).toBe('?sort=hire_date&dir=desc')
  })

  it('shows an empty state when nothing matches', async () => {
    vi.spyOn(employeesApi, 'listEmployees').mockResolvedValueOnce({ ...employeePage, items: [], total: 0 })
    renderRoute(<EmployeeDirectoryPage />, { path: '/employees', url: '/employees?q=zzz' })
    expect(await screen.findByText(/no employees match/i)).toBeInTheDocument()
  })

  it('shows API errors', async () => {
    vi.spyOn(employeesApi, 'listEmployees').mockRejectedValue(new Error('Cannot reach the server.'))
    renderRoute(<EmployeeDirectoryPage />, { path: '/employees', url: '/employees' })
    expect(await screen.findByText('Cannot reach the server.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })
})
