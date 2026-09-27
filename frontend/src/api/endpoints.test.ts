import { getAnalyticsSummary, getFilterOptions } from './analytics'
import { addSalaryRecord, createEmployee, getEmployee, listEmployees } from './employees'

function captureFetch(body: unknown = {}) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200, json: async () => body } as Response)
}

describe('API endpoints', () => {
  it('maps directory queries to API parameters', async () => {
    const fetchMock = captureFetch()
    await listEmployees({
      page: 2,
      pageSize: 50,
      search: '  ada ',
      countryCode: 'IN',
      sortBy: 'hire_date',
      sortDirection: 'desc',
    })
    expect(fetchMock.mock.calls[0][0]).toBe(
      '/api/v1/employees?page=2&page_size=50&search=ada&country_code=IN&sort_by=hire_date&sort_direction=desc',
    )
  })

  it('encodes employee ids and posts JSON bodies', async () => {
    const fetchMock = captureFetch()
    await getEmployee('a/b')
    await addSalaryRecord('emp 1', {
      amount_minor: 1,
      currency: 'USD',
      pay_frequency: 'annual',
      effective_from: '2026-01-01',
      change_reason: 'correction',
    })
    await createEmployee({} as never)

    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/employees/a%2Fb')
    expect(fetchMock.mock.calls[1][0]).toBe('/api/v1/employees/emp%201/salary-records')
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'POST' })
    expect(fetchMock.mock.calls[2][1]).toMatchObject({ method: 'POST', body: '{}' })
  })

  it('requests analytics with filters', async () => {
    const fetchMock = captureFetch()
    await getAnalyticsSummary({ department: 'Sales', employmentStatus: 'all' })
    await getFilterOptions()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/analytics/summary?department=Sales&employment_status=all')
    expect(fetchMock.mock.calls[1][0]).toBe('/api/v1/analytics/filters')
  })
})
