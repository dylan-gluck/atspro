"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useResumeService } from "@/lib/services"
import { toast } from "sonner"
import { 
  Save, 
  Undo, 
  RotateCcw, 
  Edit, 
  Download, 
  AlertCircle,
  Eye,
  FileEdit
} from "lucide-react"
import type { Resume } from "@/types/resume"
import { ResumePreview } from "./resume/ResumePreview"
import { ResumeEditForm } from "./resume/ResumeEditForm"

interface ResumeEditorProps {
  className?: string
  onSave?: (resume: Resume) => void
}

export function ResumeEditor({ className, onSave }: ResumeEditorProps) {
  const [resume, setResume] = useState<Resume | null>(null)
  const [originalResume, setOriginalResume] = useState<Resume | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("preview")
  
  const resumeService = useResumeService()

  useEffect(() => {
    loadResume()
  }, [resumeService])

  const loadResume = async () => {
    if (!resumeService) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await resumeService.getResume()
      if (response.success && response.data) {
        // Handle backend response structure: parsed_data contains the resume data
        const resumeData = response.data.parsed_data
        if (resumeData) {
          setResume(resumeData)
          setOriginalResume(JSON.parse(JSON.stringify(resumeData)))
        } else {
          setError("Resume data not found in response. Please upload a resume first.")
        }
      } else {
        setError("No resume found. Please upload a resume first.")
      }
    } catch (err) {
      console.error('Failed to load resume:', err)
      setError("Failed to load resume. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (updatedResume: Resume) => {
    if (!resumeService) return

    setSaving(true)
    try {
      const response = await resumeService.updateResume(updatedResume)
      if (response.success && response.data) {
        setResume(updatedResume)
        setOriginalResume(JSON.parse(JSON.stringify(updatedResume)))
        setHasUnsavedChanges(false)
        onSave?.(updatedResume)
        return true // Indicate success
      } else {
        throw new Error(response.message || "Failed to save resume")
      }
    } catch (err) {
      console.error('Failed to save resume:', err)
      throw err // Re-throw to let ResumeEditForm handle the error
    } finally {
      setSaving(false)
    }
  }

  const handleUndo = () => {
    if (originalResume) {
      setResume(JSON.parse(JSON.stringify(originalResume)))
      setHasUnsavedChanges(false)
      toast.info("Changes reverted")
    }
  }

  const handleReset = () => {
    loadResume()
    setHasUnsavedChanges(false)
    toast.info("Resume reloaded")
  }

  const handleDownload = async () => {
    if (!resumeService) return

    try {
      const response = await resumeService.exportResume('pdf')
      if (response.success && response.data) {
        // Create blob URL and trigger download
        const blob = response.data
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = 'resume.pdf'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success("Resume downloaded successfully!")
      } else {
        toast.error("Failed to download resume")
      }
    } catch (err) {
      console.error('Failed to download resume:', err)
      toast.error("Failed to download resume")
    }
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Resume Editor</CardTitle>
          <CardDescription>Loading your resume...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Resume Editor</CardTitle>
          <CardDescription>Unable to load resume</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!resume) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Resume Editor</CardTitle>
          <CardDescription>No resume data available</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No resume found. Please upload a resume to get started.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Resume Editor
            </CardTitle>
            <CardDescription>
              View and edit your resume content with real-time preview.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isSaving}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={!hasUnsavedChanges || isSaving}
            >
              <Undo className="h-4 w-4 mr-2" />
              Undo
            </Button>
          </div>
        </div>
        {hasUnsavedChanges && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You have unsaved changes. Don't forget to save your work!
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview Resume
            </TabsTrigger>
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <FileEdit className="h-4 w-4" />
              Edit Resume
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="preview" className="mt-6">
            <ResumePreview resume={resume} />
          </TabsContent>
          
          <TabsContent value="edit" className="mt-6">
            <ResumeEditForm 
              resume={resume} 
              onSave={handleSave}
              isSaving={isSaving}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}