"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Building2, 
  Plus, 
  Search,
  Target,
  TrendingUp
} from "lucide-react"

interface EmptyJobsStateProps {
  className?: string
  onAddJob?: () => void
  isSearching?: boolean
  searchQuery?: string
}

export function EmptyJobsState({ 
  className, 
  onAddJob, 
  isSearching = false, 
  searchQuery 
}: EmptyJobsStateProps) {
  if (isSearching && searchQuery) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-12">
          <Search className="w-16 h-16 mx-auto mb-6 text-muted-foreground/50" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            No jobs found
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            No jobs match your search for "{searchQuery}". Try adjusting your search terms or filters.
          </p>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Suggestions:</p>
            <ul className="list-disc list-inside space-y-1 max-w-xs mx-auto">
              <li>Check your spelling</li>
              <li>Try broader search terms</li>
              <li>Clear active filters</li>
              <li>Search in archived jobs</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardContent className="text-center py-12">
        <div className="relative mb-6">
          <Building2 className="w-16 h-16 mx-auto text-muted-foreground/50" />
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
            <Plus className="w-3 h-3 text-primary" />
          </div>
        </div>
        
        <h3 className="text-xl font-semibold text-foreground mb-2">
          No jobs yet
        </h3>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Start building your job pipeline by adding job opportunities you're interested in. 
          Track applications, optimize your resume, and manage your job search effectively.
        </p>
        
        {onAddJob && (
          <Button onClick={onAddJob} size="lg" className="mb-8">
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Job
          </Button>
        )}
        
        <div className="grid gap-4 md:grid-cols-3 max-w-2xl mx-auto text-left">
          <div className="space-y-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Target className="w-4 h-4 text-blue-600" />
            </div>
            <h4 className="font-medium text-sm">Track Applications</h4>
            <p className="text-xs text-muted-foreground">
              Keep track of where you've applied and follow up accordingly
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <h4 className="font-medium text-sm">Optimize Resumes</h4>
            <p className="text-xs text-muted-foreground">
              Get AI-powered suggestions to tailor your resume for each role
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-purple-600" />
            </div>
            <h4 className="font-medium text-sm">Manage Pipeline</h4>
            <p className="text-xs text-muted-foreground">
              Organize your job search with status tracking and notes
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}