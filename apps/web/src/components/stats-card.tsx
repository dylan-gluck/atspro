"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Briefcase, TrendingUp, Target, Clock } from "lucide-react"
import { useEffect, useState } from "react"
import { useJobsService } from "@/lib/services"

interface StatsData {
  totalJobs: number
  activeJobs: number
  interviewingJobs: number
  successRate: number
  isLoading: boolean
}

interface StatsCardProps {
  className?: string
}

export function StatsCard({ className }: StatsCardProps) {
  const jobsService = useJobsService()
  const [stats, setStats] = useState<StatsData>({
    totalJobs: 0,
    activeJobs: 0,
    interviewingJobs: 0,
    successRate: 0,
    isLoading: true
  })

  useEffect(() => {
    const loadStats = async () => {
      if (!jobsService) return

      try {
        setStats(prev => ({ ...prev, isLoading: true }))

        // Get all jobs to calculate stats
        const response = await jobsService.listJobs({ page: 1, page_size: 100 })
        
        if (response.success) {
          const jobs = response.data.data
          const totalJobs = jobs.length
          
          // Count jobs by status
          const activeJobs = jobs.filter(job => 
            ['saved', 'applied'].includes(job.status_info.status)
          ).length
          
          const interviewingJobs = jobs.filter(job => 
            job.status_info.status === 'interviewing'
          ).length
          
          const offeredJobs = jobs.filter(job => 
            job.status_info.status === 'offered'
          ).length
          
          const appliedJobs = jobs.filter(job => 
            ['applied', 'interviewing', 'offered', 'rejected'].includes(job.status_info.status)
          ).length
          
          // Calculate success rate (offers / applications)
          const successRate = appliedJobs > 0 ? Math.round((offeredJobs / appliedJobs) * 100) : 0

          setStats({
            totalJobs,
            activeJobs,
            interviewingJobs,
            successRate,
            isLoading: false
          })
        } else {
          setStats(prev => ({ ...prev, isLoading: false }))
        }
      } catch (error) {
        console.error('Failed to load job stats:', error)
        setStats(prev => ({ ...prev, isLoading: false }))
      }
    }

    loadStats()
  }, [jobsService])

  if (stats.isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Job Statistics</CardTitle>
          <CardDescription>Your application metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-muted rounded w-2/3"></div>
              <div className="h-4 bg-muted rounded w-1/3"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Job Statistics</CardTitle>
          <Briefcase className="h-5 w-5 text-muted-foreground" />
        </div>
        <CardDescription>Your application metrics</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Total Jobs */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">Total Jobs</span>
          </div>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            {stats.totalJobs}
          </Badge>
        </div>

        {/* Active Applications */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-600" />
            <span className="text-sm font-medium">Active</span>
          </div>
          <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-100">
            {stats.activeJobs}
          </Badge>
        </div>

        {/* Interviewing */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">Interviewing</span>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
            {stats.interviewingJobs}
          </Badge>
        </div>

        {/* Success Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Success Rate</span>
            <span className="text-sm text-muted-foreground">{stats.successRate}%</span>
          </div>
          <Progress 
            value={stats.successRate} 
            className="h-2"
            style={{
              backgroundColor: 'hsl(var(--muted))'
            }}
          />
          <div className="text-xs text-muted-foreground">
            Based on offers received vs applications
          </div>
        </div>

        {/* Quick Insights */}
        {stats.totalJobs === 0 && (
          <div className="text-center py-2">
            <div className="text-sm text-muted-foreground">
              No jobs tracked yet. Start by adding your first job!
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}