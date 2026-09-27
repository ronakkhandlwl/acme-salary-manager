import { expect, test, type Page } from '@playwright/test'

/** Show a caption bar so the silent recording explains itself. */
async function caption(page: Page, text: string, holdMs = 2500) {
  await page.evaluate((message) => {
    let bar = document.getElementById('demo-caption')
    if (!bar) {
      bar = document.createElement('div')
      bar.id = 'demo-caption'
      Object.assign(bar.style, {
        position: 'fixed', left: '50%', bottom: '24px', transform: 'translateX(-50%)', zIndex: '99999',
        background: 'rgba(17, 24, 39, 0.92)', color: 'white', padding: '12px 20px', borderRadius: '10px',
        font: '500 18px/1.4 system-ui, sans-serif', maxWidth: '80%', textAlign: 'center',
        boxShadow: '0 8px 24px rgba(0,0,0,.25)', pointerEvents: 'none',
      })
      document.body.appendChild(bar)
    }
    bar.textContent = message
  }, text)
  await page.waitForTimeout(holdMs)
}

test('ACME Salary Manager walkthrough', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('headcount')).toBeVisible()
  await caption(page, 'ACME Salary Manager replaces salary spreadsheets for 10,000 employees in 5 countries', 3500)
  await caption(page, 'Dashboard: headcount, payroll, median and average pay, always per currency, never summed across currencies', 4000)
  await page.getByRole('button', { name: 'USD' }).click()
  await caption(page, 'Switch the detailed view between currencies: pay by department and salary distribution', 3500)
  await page.mouse.wheel(0, 700)
  await caption(page, 'Highest and lowest paid, pay by country, and recent salary changes', 3500)
  await page.mouse.wheel(0, -700)

  await page.getByRole('combobox', { name: 'Country' }).click()
  await page.getByRole('option', { name: 'India' }).click()
  await caption(page, 'Filter by country, department or employment status. Every figure is computed in the database', 3500)

  await page.getByRole('tab', { name: 'Employees' }).click()
  await caption(page, 'Employee directory: server-side search, filters, sorting and pagination', 3000)
  await page.getByRole('textbox', { name: 'Search' }).pressSequentially('Priya', { delay: 120 })
  await page.getByRole('combobox', { name: 'Department' }).click()
  await page.getByRole('option', { name: 'Engineering' }).click()
  await caption(page, 'Filters live in the URL, so any view can be bookmarked or shared', 3000)
  await page.getByRole('table', { name: 'Employee directory' }).getByRole('link').first().click()

  await expect(page.getByTestId('current-salary')).toBeVisible()
  await caption(page, 'Profile: current salary and the full, append-only salary history', 3500)
  await page.getByRole('button', { name: 'Record salary change' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Amount').pressSequentially('1650000', { delay: 120 })
  await caption(page, 'Recording a raise previews the change against current pay before saving', 3500)
  await dialog.getByRole('combobox', { name: 'Reason' }).click()
  await page.getByRole('option', { name: 'Promotion' }).click()
  await dialog.getByRole('button', { name: 'Save salary change' }).click()
  await expect(dialog).toBeHidden()
  await caption(page, 'Saved as a new record. History is never overwritten', 3500)

  await page.getByRole('tab', { name: 'Dashboard' }).click()
  await page.mouse.wheel(0, 1600)
  await caption(page, 'The dashboard reflects the change immediately in recent salary changes', 4000)
})
