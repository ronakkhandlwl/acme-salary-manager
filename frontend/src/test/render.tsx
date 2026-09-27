import { ThemeProvider } from '@mui/material/styles'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { theme } from '../app/theme'

/** Render a page at a URL with the same providers the app uses; returns the router for URL assertions. */
export function renderRoute(element: ReactElement, options: { path?: string; url?: string } = {}) {
  const path = options.path ?? '/'
  const url = options.url ?? path
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const router = createMemoryRouter(
    [
      { path, element },
      { path: '/employees/:employeeId', element: <p>Profile page</p> },
    ],
    { initialEntries: [url] },
  )
  const view = render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>,
  )
  return { ...view, router, queryClient }
}
