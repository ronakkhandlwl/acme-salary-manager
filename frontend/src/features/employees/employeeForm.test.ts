import { EMPTY_EMPLOYEE, validateEmployee } from './employeeForm'

const valid = {
  ...EMPTY_EMPLOYEE,
  employee_number: 'EMP-20001',
  first_name: 'Grace',
  last_name: 'Hopper',
  email: 'grace@acme.example.com',
  country_code: 'us',
  department: 'Engineering',
  title: 'Director',
  hire_date: '2026-09-01',
}

describe('validateEmployee', () => {
  it('accepts a complete employee', () => {
    expect(validateEmployee(valid)).toEqual({})
  })

  it('requires every field and checks email and country formats', () => {
    const errors = validateEmployee({ ...valid, first_name: ' ', email: 'grace@', country_code: 'USA' })
    expect(errors).toEqual({
      first_name: 'First name is required',
      email: 'Enter a valid email',
      country_code: 'Use a two-letter ISO code',
    })
  })
})
