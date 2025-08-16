"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bell, Check, X, AlertCircle, Info, CheckCircle, XCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { useNotificationService } from "@/lib/services"
import type { Notification } from "@/types/database"
import { formatDistanceToNow } from "date-fns"

interface NotificationCardProps {
  className?: string
}

const NotificationIcon = ({ type }: { type: Notification['type'] }) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case 'error':
      return <XCircle className="h-4 w-4 text-red-600" />
    case 'warning':
      return <AlertCircle className="h-4 w-4 text-orange-600" />
    case 'info':
    default:
      return <Info className="h-4 w-4 text-blue-600" />
  }
}

const NotificationBadge = ({ category }: { category: Notification['category'] }) => {
  const colors = {
    system: 'bg-gray-100 text-gray-800',
    optimization: 'bg-blue-100 text-blue-800',
    job: 'bg-green-100 text-green-800',
    subscription: 'bg-purple-100 text-purple-800'
  }

  return (
    <Badge variant="secondary" className={`text-xs ${colors[category]} hover:${colors[category]}`}>
      {category}
    </Badge>
  )
}

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
}

function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })

  return (
    <div className={`p-3 border-b last:border-b-0 ${notification.is_read ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <div className="mt-0.5">
            <NotificationIcon type={notification.type} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-medium truncate">{notification.title}</h4>
              <NotificationBadge category={notification.category} />
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {notification.message}
            </p>
            <div className="text-xs text-muted-foreground mt-1">
              {timeAgo}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {!notification.is_read && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => onMarkAsRead(notification.id)}
              title="Mark as read"
            >
              <Check className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(notification.id)}
            title="Delete notification"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {notification.action_url && (
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs mt-2"
          onClick={() => window.location.href = notification.action_url!}
        >
          View Details →
        </Button>
      )}
    </div>
  )
}

export function NotificationCard({ className }: NotificationCardProps) {
  const notificationService = useNotificationService()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const loadNotifications = async () => {
    if (!notificationService) return

    try {
      setIsLoading(true)
      
      // Get recent unread notifications
      const response = await notificationService.getNotifications({
        page: 1,
        page_size: 5
      })
      
      if (response.success) {
        setNotifications(response.data.data)
        
        // Get unread count
        const unreadResponse = await notificationService.getNotifications({
          is_read: false,
          page: 1,
          page_size: 1
        })
        
        if (unreadResponse.success) {
          setUnreadCount(unreadResponse.data.total)
        }
      }
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()

    // Listen for real-time notifications
    const handleNewNotification = () => {
      loadNotifications()
    }

    window.addEventListener('newNotification', handleNewNotification)
    
    return () => {
      window.removeEventListener('newNotification', handleNewNotification)
    }
  }, [notificationService, loadNotifications])

  const handleMarkAsRead = async (id: string) => {
    if (!notificationService) return

    try {
      await notificationService.markAsRead(id)
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!notificationService) return

    try {
      await notificationService.deleteNotification(id)
      
      // Update local state
      const notification = notifications.find(n => n.id === id)
      setNotifications(prev => prev.filter(n => n.id !== id))
      
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!notificationService) return

    try {
      await notificationService.markAllAsRead()
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Notifications</CardTitle>
          <CardDescription>Recent updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Notifications</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </div>
          <Bell className="h-5 w-5 text-muted-foreground" />
        </div>
        <CardDescription>Recent updates and alerts</CardDescription>
      </CardHeader>
      
      <CardContent className="p-0">
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No notifications yet
          </div>
        ) : (
          <>
            <ScrollArea className="h-64">
              {notifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDelete}
                />
              ))}
            </ScrollArea>
            
            {unreadCount > 0 && (
              <div className="p-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleMarkAllAsRead}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Mark All as Read
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}