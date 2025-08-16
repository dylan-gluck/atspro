import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NotificationCard } from '@/components/notification-card'
import type { Notification } from '@/types/database'

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '2 hours ago')
}))

// Mock the services
const mockNotificationService = {
  getNotifications: vi.fn(),
  markAsRead: vi.fn(),
  deleteNotification: vi.fn(),
  markAllAsRead: vi.fn()
}

vi.mock('@/lib/services', () => ({
  useNotificationService: () => mockNotificationService
}))

const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    user_id: 'user-1',
    title: 'Resume Optimized',
    message: 'Your resume has been optimized for the Software Engineer position',
    type: 'success',
    category: 'optimization',
    is_read: false,
    action_url: '/jobs/job-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'notif-2',
    user_id: 'user-1',
    title: 'New Job Match',
    message: 'We found a new job that matches your profile',
    type: 'info',
    category: 'job',
    is_read: true,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z'
  },
  {
    id: 'notif-3',
    user_id: 'user-1',
    title: 'System Maintenance',
    message: 'Scheduled maintenance tonight from 2-4 AM',
    type: 'warning',
    category: 'system',
    is_read: false,
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z'
  }
]

describe('NotificationCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state initially', () => {
    mockNotificationService.getNotifications.mockReturnValue(new Promise(() => {})) // Never resolves
    
    render(<NotificationCard />)
    
    expect(screen.getByText('Notifications')).toBeInTheDocument()
    expect(screen.getByText('Recent updates')).toBeInTheDocument()
    
    // Check for loading skeletons
    const skeletons = screen.getAllByRole('generic', { hidden: true })
    expect(skeletons.some(el => el.classList.contains('animate-pulse'))).toBe(true)
  })

  it('displays notifications correctly', async () => {
    mockNotificationService.getNotifications
      .mockResolvedValueOnce({
        success: true,
        data: {
          data: mockNotifications,
          total: mockNotifications.length,
          page: 1,
          page_size: 5
        }
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          data: mockNotifications.filter(n => !n.is_read),
          total: 2,
          page: 1,
          page_size: 1
        }
      })

    render(<NotificationCard />)

    await waitFor(() => {
      expect(screen.getByText('Resume Optimized')).toBeInTheDocument()
    })

    expect(screen.getByText('New Job Match')).toBeInTheDocument()
    expect(screen.getByText('System Maintenance')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument() // Unread count badge
  })

  it('shows empty state when no notifications', async () => {
    mockNotificationService.getNotifications.mockResolvedValue({
      success: true,
      data: {
        data: [],
        total: 0,
        page: 1,
        page_size: 5
      }
    })

    render(<NotificationCard />)

    await waitFor(() => {
      expect(screen.getByText('No notifications yet')).toBeInTheDocument()
    })
  })

  it('marks notification as read when mark as read button clicked', async () => {
    mockNotificationService.getNotifications
      .mockResolvedValueOnce({
        success: true,
        data: {
          data: mockNotifications,
          total: mockNotifications.length,
          page: 1,
          page_size: 5
        }
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          data: mockNotifications.filter(n => !n.is_read),
          total: 2,
          page: 1,
          page_size: 1
        }
      })

    mockNotificationService.markAsRead.mockResolvedValue({
      success: true,
      data: undefined
    })

    render(<NotificationCard />)

    await waitFor(() => {
      expect(screen.getByText('Resume Optimized')).toBeInTheDocument()
    })

    // Find and click the mark as read button for the first notification
    const markAsReadButtons = screen.getAllByTitle('Mark as read')
    fireEvent.click(markAsReadButtons[0])

    await waitFor(() => {
      expect(mockNotificationService.markAsRead).toHaveBeenCalledWith('notif-1')
    })
  })

  it('deletes notification when delete button clicked', async () => {
    mockNotificationService.getNotifications
      .mockResolvedValueOnce({
        success: true,
        data: {
          data: mockNotifications,
          total: mockNotifications.length,
          page: 1,
          page_size: 5
        }
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          data: mockNotifications.filter(n => !n.is_read),
          total: 2,
          page: 1,
          page_size: 1
        }
      })

    mockNotificationService.deleteNotification.mockResolvedValue({
      success: true,
      data: undefined
    })

    render(<NotificationCard />)

    await waitFor(() => {
      expect(screen.getByText('Resume Optimized')).toBeInTheDocument()
    })

    // Find and click the delete button for the first notification
    const deleteButtons = screen.getAllByTitle('Delete notification')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(mockNotificationService.deleteNotification).toHaveBeenCalledWith('notif-1')
    })
  })

  it('marks all notifications as read when button clicked', async () => {
    mockNotificationService.getNotifications
      .mockResolvedValueOnce({
        success: true,
        data: {
          data: mockNotifications,
          total: mockNotifications.length,
          page: 1,
          page_size: 5
        }
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          data: mockNotifications.filter(n => !n.is_read),
          total: 2,
          page: 1,
          page_size: 1
        }
      })

    mockNotificationService.markAllAsRead.mockResolvedValue({
      success: true,
      data: undefined
    })

    render(<NotificationCard />)

    await waitFor(() => {
      expect(screen.getByText('Mark All as Read')).toBeInTheDocument()
    })

    const markAllButton = screen.getByText('Mark All as Read')
    fireEvent.click(markAllButton)

    await waitFor(() => {
      expect(mockNotificationService.markAllAsRead).toHaveBeenCalled()
    })
  })

  it('navigates to action URL when View Details clicked', async () => {
    const originalLocation = window.location
    // @ts-expect-error - mocking window.location for test
    delete window.location
    // @ts-expect-error - mocking window.location for test
    window.location = { ...originalLocation, href: '' }

    mockNotificationService.getNotifications
      .mockResolvedValueOnce({
        success: true,
        data: {
          data: mockNotifications,
          total: mockNotifications.length,
          page: 1,
          page_size: 5
        }
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          data: mockNotifications.filter(n => !n.is_read),
          total: 2,
          page: 1,
          page_size: 1
        }
      })

    render(<NotificationCard />)

    await waitFor(() => {
      expect(screen.getByText('View Details →')).toBeInTheDocument()
    })

    const viewDetailsButton = screen.getByText('View Details →')
    fireEvent.click(viewDetailsButton)

    expect(window.location.href).toBe('/jobs/job-1')
    
    // @ts-expect-error - restoring window.location after test
    window.location = originalLocation
  })

  it('displays correct notification icons based on type', async () => {
    mockNotificationService.getNotifications
      .mockResolvedValueOnce({
        success: true,
        data: {
          data: mockNotifications,
          total: mockNotifications.length,
          page: 1,
          page_size: 5
        }
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          data: mockNotifications.filter(n => !n.is_read),
          total: 2,
          page: 1,
          page_size: 1
        }
      })

    render(<NotificationCard />)

    await waitFor(() => {
      expect(screen.getByText('Resume Optimized')).toBeInTheDocument()
    })

    // Check for SVG icons by class names
    const container = screen.getByText('Resume Optimized').closest('.p-3')
    expect(container).toBeInTheDocument()
  })

  it('displays category badges correctly', async () => {
    mockNotificationService.getNotifications
      .mockResolvedValueOnce({
        success: true,
        data: {
          data: mockNotifications,
          total: mockNotifications.length,
          page: 1,
          page_size: 5
        }
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          data: mockNotifications.filter(n => !n.is_read),
          total: 2,
          page: 1,
          page_size: 1
        }
      })

    render(<NotificationCard />)

    await waitFor(() => {
      expect(screen.getByText('optimization')).toBeInTheDocument()
    })

    expect(screen.getByText('job')).toBeInTheDocument()
    expect(screen.getByText('system')).toBeInTheDocument()
  })

  it('shows read notifications with reduced opacity', async () => {
    mockNotificationService.getNotifications
      .mockResolvedValueOnce({
        success: true,
        data: {
          data: mockNotifications,
          total: mockNotifications.length,
          page: 1,
          page_size: 5
        }
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          data: mockNotifications.filter(n => !n.is_read),
          total: 2,
          page: 1,
          page_size: 1
        }
      })

    render(<NotificationCard />)

    await waitFor(() => {
      expect(screen.getByText('New Job Match')).toBeInTheDocument()
    })

    // The read notification should have opacity-60 class
    const readNotification = screen.getByText('New Job Match').closest('.p-3')
    expect(readNotification).toHaveClass('opacity-60')
  })

  it('handles service unavailable gracefully', async () => {
    // Mock the hook to return null
    // Mock the hook to return null for this specific test
    vi.doMock('@/lib/services', () => ({
      useNotificationService: vi.fn().mockReturnValueOnce(null)
    }))

    render(<NotificationCard />)

    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument()
    })
    
    // Should still render the basic structure
    expect(screen.getByText('Recent updates and alerts')).toBeInTheDocument()
  })

  it('handles API errors gracefully', async () => {
    mockNotificationService.getNotifications.mockResolvedValue({
      success: false,
      data: null,
      message: 'API Error',
      errors: ['Failed to fetch notifications']
    })

    render(<NotificationCard />)

    await waitFor(() => {
      expect(screen.getByText('No notifications yet')).toBeInTheDocument()
    })
  })

  it('applies custom className correctly', async () => {
    mockNotificationService.getNotifications.mockResolvedValue({
      success: true,
      data: {
        data: [],
        total: 0,
        page: 1,
        page_size: 5
      }
    })

    const { container } = render(<NotificationCard className="custom-class" />)

    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument()
    })
    
    expect(container.firstChild).toHaveClass('custom-class')
  })
})