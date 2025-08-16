"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ProfileCard } from "@/components/profile-card"
import { StatsCard } from "@/components/stats-card"
import { NotificationCard } from "@/components/notification-card"
import { JobCreation } from "@/components/job-creation"
import { JobList } from "@/components/job-list"
import { authClient } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useUserService } from "@/lib/services"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import type { BetterAuthUser, UserProfile, JobEntity } from "@/types/database"

interface DashboardProps {
  user: BetterAuthUser
}

export function Dashboard({ user }: DashboardProps) {
  const router = useRouter()
  const userService = useUserService()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false)
  const [jobListRefreshTrigger, setJobListRefreshTrigger] = useState(0)

  useEffect(() => {
    const loadProfile = async () => {
      if (!userService) return

      try {
        const response = await userService.getProfile()
        if (response.success) {
          setProfile(response.data)
        }
      } catch (error) {
        console.error('Failed to load user profile:', error)
      }
    }

    loadProfile()
  }, [userService])

  const handleSignOut = async () => {
    try {
      await authClient.signOut()
      toast.success("Signed out successfully")
      router.push("/sign-in")
      router.refresh()
    } catch {
      toast.error("Failed to sign out")
    }
  }

  const handleJobCreated = (job: JobEntity) => {
    setIsJobDialogOpen(false)
    setJobListRefreshTrigger(prev => prev + 1)
    toast.success(`Job "${job.title}" added successfully!`)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">ATS Pro</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user.name}
            </span>
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Top Row - Main Dashboard Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <ProfileCard 
            user={user} 
            profile={profile}
            className="md:col-span-1"
          />
          <StatsCard 
            className="md:col-span-1"
          />
          <NotificationCard 
            className="md:col-span-1 lg:col-span-1"
          />
        </div>

        {/* Job Management Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Job Management</h2>
            <Dialog open={isJobDialogOpen} onOpenChange={setIsJobDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Job
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Job</DialogTitle>
                </DialogHeader>
                <JobCreation onJobCreated={handleJobCreated} />
              </DialogContent>
            </Dialog>
          </div>
          
          <JobList 
            refreshTrigger={jobListRefreshTrigger}
            className="mt-6"
          />
        </div>
      </main>
    </div>
  )
}