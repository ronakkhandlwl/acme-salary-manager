import { ApiError, buildQuery, request } from './client'

function mockFetch(response: { ok?: boolean; status?: number; body?: unknown }) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    json: async () => response.body,
  } as Response)
}

describe('buildQuery', () => {
  it('omits empty values and encodes the rest', () => {
    expect(buildQuery({ search: 'ada l', page: 2, country: undefined, dept: '' })).toBe('?search=ada+l&page=2')
    expect(buildQuery({})).toBe('')
  })
})

describe('request', () => {
  it('returns parsed JSON on success', async () => {
    mockFetch({ body: { status: 'ok' } })
    await expect(request('/health')).resolves.toEqual({ status: 'ok' })
  })

  it('surfaces string error details from the API', async () => {
    mockFetch({ ok: false, status: 409, body: { detail: 'employee number or email already exists' } })
    await expect(request('/x')).rejects.toMatchObject({ status: 409, message: 'employee number or email already exists' })
  })

  it('flattens FastAPI validation errors into one readable message', async () => {
    mockFetch({
      ok: false,
      status: 422,
      body: { detail: [{ loc: ['body', 'currency'], msg: 'String should match pattern' }] },
    })
    await expect(request('/x')).rejects.toThrow('currency: String should match pattern')
  })

  it('reports network failures as ApiError with status 0', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    const error = await request('/x').catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(0)
  })

  it('hides server internals on 5xx', async () => {
    mockFetch({ ok: false, status: 500, body: null })
    await expect(request('/x')).rejects.toThrow('The server had a problem')
  })
})
