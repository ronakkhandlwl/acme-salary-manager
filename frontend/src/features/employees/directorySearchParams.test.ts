import { readDirectoryQuery, writeDirectoryQuery } from './directorySearchParams'

describe('directory URL state', () => {
  it('uses safe defaults for missing or invalid values', () => {
    expect(readDirectoryQuery(new URLSearchParams('page=-3&size=7&sort=salary&status=retired'))).toEqual({
      page: 1,
      pageSize: 25,
      search: undefined,
      countryCode: undefined,
      department: undefined,
      employmentStatus: undefined,
      sortBy: 'last_name',
      sortDirection: 'asc',
    })
  })

  it('round-trips a query and omits defaults from the URL', () => {
    const query = readDirectoryQuery(new URLSearchParams('q=ada&country=IN&status=active&sort=hire_date&dir=desc&page=3&size=50'))
    expect(writeDirectoryQuery(query).toString()).toBe('q=ada&country=IN&status=active&sort=hire_date&dir=desc&page=3&size=50')
    expect(writeDirectoryQuery({ ...query, page: 1, pageSize: 25, sortBy: 'last_name', sortDirection: 'asc' }).toString()).toBe(
      'q=ada&country=IN&status=active',
    )
  })
})
