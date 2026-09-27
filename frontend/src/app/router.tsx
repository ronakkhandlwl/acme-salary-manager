import { Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'
import { NotFoundPage } from '../components/NotFoundPage'
import { LoadingState } from '../components/QueryState'
import { AppLayout } from './AppLayout'
import { EmployeeDirectoryPage, EmployeeProfilePage } from './lazyPages'

function page(element: ReactNode) {
  return <Suspense fallback={<LoadingState />}>{element}</Suspense>
}

export const routes = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/employees" replace /> },
      { path: 'employees', element: page(<EmployeeDirectoryPage />) },
      { path: 'employees/:employeeId', element: page(<EmployeeProfilePage />) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
