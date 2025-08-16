"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { CheckCircle, Upload, User } from "lucide-react"
import type { BetterAuthUser, UserProfile } from "@/types/database"

interface ProfileCardProps {
  user: BetterAuthUser
  profile?: UserProfile | null
  className?: string
}

export function ProfileCard({ user, profile, className }: ProfileCardProps) {
  const hasResume = Boolean(profile?.resume_id)
  const initials = user.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase()
    : user.email[0].toUpperCase()

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Profile</CardTitle>
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
        <CardDescription>Your account overview</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* User Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{user.name || "No name set"}</span>
          </div>
          <div className="text-sm text-muted-foreground pl-6">
            {user.email}
          </div>
          {profile?.title && (
            <div className="text-sm text-muted-foreground pl-6">
              {profile.title}
            </div>
          )}
          {profile?.location && (
            <div className="text-sm text-muted-foreground pl-6">
              📍 {profile.location}
            </div>
          )}
        </div>

        {/* Resume Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Resume Status</span>
            {hasResume ? (
              <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                <CheckCircle className="h-3 w-3 mr-1" />
                Active
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-100">
                <Upload className="h-3 w-3 mr-1" />
                Pending
              </Badge>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground">
            {hasResume 
              ? "Your resume is uploaded and ready for optimization"
              : "Upload your resume to get started with job matching"
            }
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {hasResume ? (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => {
                // Navigate to resume editor
                window.location.href = "/resume"
              }}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              View/Edit Resume
            </Button>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => {
                // Navigate to onboarding
                window.location.href = "/onboarding"
              }}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Resume
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}