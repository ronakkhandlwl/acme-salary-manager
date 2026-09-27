import { lazy } from 'react'

// Route-level code splitting keeps the charting library out of the directory bundle.
export const EmployeeDirectoryPage = lazy(() =>
  import('../features/employees/EmployeeDirectoryPage').then((module) => ({
    default: module.EmployeeDirectoryPage,
  })),
)
export const EmployeeProfilePage = lazy(() =>
  import('../features/employees/EmployeeProfilePage').then((module) => ({
    default: module.EmployeeProfilePage,
  })),
)
