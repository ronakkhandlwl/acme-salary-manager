import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

// MUI X Charts measure their container; jsdom has no layout engine.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver

// Lazy-loaded routes can take over a second to import on slow CI machines.
configure({ asyncUtilTimeout: 5_000 })

afterEach(() => cleanup())
