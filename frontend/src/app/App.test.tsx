import { ThemeProvider } from '@mui/material/styles'
import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import * as analyticsApi from '../api/analytics'
import * as employeesApi from '../api/employees'
import { ApiError } from '../api/client'
import { employeePage, summary } from '../test/fixtures'
import { createQueryClient } from './queryClient'
import { routes } from './router'
import { theme } from './theme'

function renderApp(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] })
  render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={createQueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>,
  )
  return router
}

beforeEach(() => {
  vi.spyOn(analyticsApi, 'getFilterOptions').mockResolvedValue({ countries: [], departments: [] })
  vi.spyOn(analyticsApi, 'getAnalyticsSummary').mockResolvedValue(summary)
  vi.spyOn(employeesApi, 'listEmployees').mockResolvedValue(employeePage)
})

describe('application shell', () => {
  it('navigates between the dashboard and the directory', async () => {
    const router = renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Compensation overview' })).toBeInTheDocument()

    await userEvent.setup().click(screen.getByRole('tab', { name: 'Employees' }))

    expect(await screen.findByRole('heading', { name: 'Employees' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/employees')
    expect(screen.getByRole('tab', { name: 'Employees' })).toHaveAttribute('aria-selected', 'true')
  })

  it('shows a not-found page for unknown routes', async () => {
    renderApp('/nowhere')
    expect(await screen.findByText('Page not found')).toBeInTheDocument()
  })
})

describe('query retry policy', () => {
  const retry = createQueryClient().getDefaultOptions().queries!.retry as (count: number, error: unknown) => boolean

  it('does not retry client errors', () => {
    expect(retry(0, new ApiError(404, 'not found'))).toBe(false)
  })

  it('retries transient failures twice', () => {
    expect(retry(0, new ApiError(503, 'unavailable'))).toBe(true)
    expect(retry(1, new ApiError(0, 'offline'))).toBe(true)
    expect(retry(2, new ApiError(0, 'offline'))).toBe(false)
  })
})
