"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ResumeEditor } from "@/components/ResumeEditor"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import type { Resume } from "@/types/resume"

export default function ResumePage() {
  const router = useRouter()

  const handleBack = () => {
    router.push('/')
  }

  const handleResumeSave = (resume: Resume) => {
    // Optionally handle any additional logic after save
    console.log('Resume saved:', resume)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Resume Editor</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <ResumeEditor 
          className="max-w-6xl mx-auto"
          onSave={handleResumeSave}
        />
      </main>
    </div>
  )
}