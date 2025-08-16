import '@testing-library/jest-dom'
import { vi, afterEach } from 'vitest'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}))

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000'
process.env.BETTER_AUTH_URL = 'http://localhost:8000/api/auth'

// Mock Web APIs that might not be available in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock EventSource for notifications
const MockEventSource = vi.fn().mockImplementation(() => ({
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  onopen: null,
  onmessage: null,
  onerror: null,
  readyState: 0,
}))

// Add static properties to the mock constructor
const MockEventSourceClass = MockEventSource as unknown as typeof EventSource;
Object.defineProperty(MockEventSourceClass, 'CONNECTING', { value: 0, writable: false });
Object.defineProperty(MockEventSourceClass, 'OPEN', { value: 1, writable: false });
Object.defineProperty(MockEventSourceClass, 'CLOSED', { value: 2, writable: false });

global.EventSource = MockEventSourceClass;

// Mock fetch globally
global.fetch = vi.fn()

// Mock better-auth client
vi.mock('@/lib/auth-client', () => ({
  authClient: {
    signIn: {
      email: vi.fn(),
    },
    signUp: {
      email: vi.fn(),
    },
    signOut: vi.fn(),
    getSession: vi.fn(),
    updateUser: vi.fn(),
    sendVerificationEmail: vi.fn(),
    verifyEmail: vi.fn(),
    changePassword: vi.fn(),
    forgetPassword: vi.fn(),
    resetPassword: vi.fn(),
  },
}))

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks()
})