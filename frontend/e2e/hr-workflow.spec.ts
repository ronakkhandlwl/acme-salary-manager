import { expect, test } from '@playwright/test'

test.describe('HR manager workflow', () => {
  test('finds an employee, records a raise and sees it everywhere', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Compensation overview' })).toBeVisible()
    await expect(page.getByTestId('headcount')).not.toHaveText('0')

    await page.getByRole('tab', { name: 'Employees' }).click()
    await expect(page.getByText(/10,000 matching employees/)).toBeVisible()
    await page.getByRole('textbox', { name: 'Search' }).fill('EMP-00042')
    await expect(page).toHaveURL(/q=EMP-00042/)
    await expect(page.getByText('1 matching employees')).toBeVisible()
    await page.getByRole('table', { name: 'Employee directory' }).getByRole('link').first().click()

    await expect(page.getByTestId('current-salary')).toBeVisible()
    const name = (await page.getByRole('heading', { level: 1 }).textContent())!.trim()
    const historyRows = page.getByRole('table', { name: 'Salary history' }).getByRole('row')
    const recordsBefore = await historyRows.count()

    await page.getByRole('button', { name: 'Record salary change' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Amount').fill('123,456')
    await expect(dialog.getByText(/Annual pay .* → .*123,456/)).toBeVisible()
    await dialog.getByRole('combobox', { name: 'Reason' }).click()
    await page.getByRole('option', { name: 'Promotion' }).click()
    await dialog.getByRole('button', { name: 'Save salary change' }).click()
    await expect(dialog).toBeHidden()

    await expect(page.getByTestId('current-salary')).toContainText('123,456')
    await expect(historyRows).toHaveCount(recordsBefore + 1)
    await expect(historyRows.nth(1)).toContainText('Current')
    await expect(historyRows.nth(1)).toContainText('Promotion')

    await page.getByRole('tab', { name: 'Dashboard' }).click()
    const recent = page.getByRole('table', { name: 'Recent salary changes' })
    await expect(recent.getByRole('row').nth(1)).toContainText(name)
  })

  test('rejects an invalid salary change without saving it', async ({ page }) => {
    await page.goto('/employees?q=EMP-00007')
    await page.getByRole('table', { name: 'Employee directory' }).getByRole('link').first().click()
    await expect(page.getByTestId('current-salary')).toBeVisible()
    const historyRows = page.getByRole('table', { name: 'Salary history' }).getByRole('row')
    const recordsBefore = await historyRows.count()

    await page.getByRole('button', { name: 'Record salary change' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Amount').fill('-500')
    await dialog.getByRole('button', { name: 'Save salary change' }).click()

    await expect(dialog.getByText(/Enter a positive amount/)).toBeVisible()
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(historyRows).toHaveCount(recordsBefore)
  })

  test('adds a new hire with a starting salary', async ({ page }) => {
    await page.goto('/employees')
    await page.getByRole('button', { name: 'Add employee' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('First name').fill('Grace')
    await dialog.getByLabel('Last name').fill('Hopper')
    await dialog.getByLabel('Work email').fill(`grace.${Date.now()}@acme.example.com`)
    await dialog.getByLabel('Employee number').fill(`EMP-E2E-${Date.now() % 100000}`)
    await dialog.getByLabel('Job title').fill('Director')
    await dialog.getByLabel('Department').fill('Engineering')
    await dialog.getByLabel(/Country code/).fill('US')
    await dialog.getByLabel('Amount').fill('185000')
    await dialog.getByRole('button', { name: 'Create employee' }).click()

    await expect(page.getByRole('heading', { name: 'Grace Hopper' })).toBeVisible()
    await expect(page.getByTestId('current-salary')).toHaveText('$185,000')
    await expect(page.getByRole('table', { name: 'Salary history' })).toContainText('Initial offer')
  })

  test('filters the dashboard and keeps currencies separate', async ({ page }) => {
    await page.goto('/?country=IN')
    await expect(page.getByLabel('INR payroll')).toBeVisible()
    await expect(page.getByLabel('USD payroll')).toHaveCount(0)
    await expect(page.getByText('Salary distribution (INR)')).toBeVisible()
  })
})
