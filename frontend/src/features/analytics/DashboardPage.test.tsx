import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as analyticsApi from '../../api/analytics'
import { summary } from '../../test/fixtures'
import { renderRoute } from '../../test/render'
import { DashboardPage } from './DashboardPage'

beforeEach(() => {
  vi.spyOn(analyticsApi, 'getFilterOptions').mockResolvedValue({ countries: ['GB', 'IN'], departments: ['Engineering'] })
})

describe('DashboardPage', () => {
  it('keeps payroll separated by currency', async () => {
    vi.spyOn(analyticsApi, 'getAnalyticsSummary').mockResolvedValue(summary)

    renderRoute(<DashboardPage />)

    expect(await screen.findByTestId('headcount')).toHaveTextContent('3')
    expect(within(screen.getByLabelText('GBP payroll')).getAllByText('£90K')).toHaveLength(3) // payroll, median, average
    expect(within(screen.getByLabelText('INR payroll')).getByText('₹3M')).toBeInTheDocument()
    expect(screen.queryByText(/total payroll/i)).not.toBeInTheDocument()
  })

  it('defaults detail views to the largest currency and lets HR switch', async () => {
    vi.spyOn(analyticsApi, 'getAnalyticsSummary').mockResolvedValue(summary)
    const { router } = renderRoute(<DashboardPage />)
    const user = userEvent.setup()

    expect(await screen.findByText('Highest and lowest paid (INR)')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Priya Iyer' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'GBP' }))

    expect(router.state.location.search).toBe('?currency=GBP')
    expect(await screen.findByText('Highest and lowest paid (GBP)')).toBeInTheDocument()
  })

  it('passes filters from the URL to the API', async () => {
    const getSummary = vi.spyOn(analyticsApi, 'getAnalyticsSummary').mockResolvedValue(summary)
    renderRoute(<DashboardPage />, { url: '/?country=IN&status=all' })
    await waitFor(() =>
      expect(getSummary).toHaveBeenCalledWith({ countryCode: 'IN', department: undefined, employmentStatus: 'all' }),
    )
  })

  it('explains when no one matches', async () => {
    vi.spyOn(analyticsApi, 'getAnalyticsSummary').mockResolvedValue({
      ...summary,
      headcount: 0,
      payroll_by_currency: [],
      recent_changes: [],
    })
    renderRoute(<DashboardPage />)
    expect(await screen.findByText(/no employees with a salary match/i)).toBeInTheDocument()
  })
})
