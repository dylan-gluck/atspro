"use client"

import { useEffect, useRef, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { Save } from "lucide-react"
import { Resume } from "@/types/resume"
import { ContactInfoEditor } from "./sections/ContactInfoEditor"
import { WorkExperienceEditor } from "./sections/WorkExperienceEditor"
import { EducationEditor } from "./sections/EducationEditor"
import { CertificationsEditor } from "./sections/CertificationsEditor"
import { SkillsEditor } from "./sections/SkillsEditor"

// Validation schema for Resume
const linkSchema = z.object({
  name: z.string().min(1, "Link name is required"),
  url: z.string().url("Invalid URL format")
})

const contactInfoSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email").nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  links: z.array(linkSchema).default([])
})

const workExperienceSchema = z.object({
  company: z.string().min(1, "Company is required"),
  position: z.string().min(1, "Position is required"),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  is_current: z.boolean().optional().default(false),
  description: z.string().nullable().optional(),
  responsibilities: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([])
})

const educationSchema = z.object({
  institution: z.string().min(1, "Institution is required"),
  degree: z.string().min(1, "Degree is required"),
  field_of_study: z.string().nullable().optional(),
  graduation_date: z.string().nullable().optional(),
  gpa: z.number().min(0).max(4).nullable().optional(),
  honors: z.array(z.string()).default([]),
  relevant_courses: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([])
})

const certificationSchema = z.object({
  name: z.string().min(1, "Certification name is required"),
  issuer: z.string().min(1, "Issuer is required"),
  date_obtained: z.string().nullable().optional(),
  expiration_date: z.string().nullable().optional(),
  credential_id: z.string().nullable().optional()
})

const resumeSchema = z.object({
  contact_info: contactInfoSchema,
  summary: z.string().nullable().optional(),
  work_experience: z.array(workExperienceSchema).default([]),
  education: z.array(educationSchema).default([]),
  certifications: z.array(certificationSchema).default([]),
  skills: z.array(z.string()).default([])
})

interface ResumeEditFormProps {
  resume: Resume
  onSave: (resume: Resume) => Promise<void>
  isSaving?: boolean
}

export function ResumeEditForm({ resume, onSave, isSaving = false }: ResumeEditFormProps) {
  const form = useForm<Resume>({
    resolver: zodResolver(resumeSchema),
    defaultValues: resume,
    mode: "onChange"
  })

  const { handleSubmit, watch, reset, formState: { isDirty, errors } } = form

  // Reset form when resume changes
  useEffect(() => {
    reset(resume)
  }, [resume, reset])

  const onSubmit = async (data: Resume) => {
    try {
      // Clean up null/empty string values to match backend expectations
      const cleanedData = {
        ...data,
        contact_info: {
          ...data.contact_info,
          email: data.contact_info.email || null,
          phone: data.contact_info.phone || null,
          address: data.contact_info.address || null
        },
        summary: data.summary || null,
        work_experience: data.work_experience.map(exp => ({
          ...exp,
          start_date: exp.start_date || null,
          end_date: exp.end_date || null,
          description: exp.description || null
        })),
        education: data.education.map(edu => ({
          ...edu,
          field_of_study: edu.field_of_study || null,
          graduation_date: edu.graduation_date || null,
          gpa: edu.gpa || null
        })),
        certifications: data.certifications.map(cert => ({
          ...cert,
          date_obtained: cert.date_obtained || null,
          expiration_date: cert.expiration_date || null,
          credential_id: cert.credential_id || null
        }))
      }

      await onSave(cleanedData)
      // Toast moved to after successful onSave call to fix timing
      toast.success("Resume saved successfully!")
    } catch (error) {
      console.error("Failed to save resume:", error)
      // Enhanced error handling with more specific messages
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      toast.error(`Failed to save resume: ${errorMessage}. Please try again.`)
      throw error // Re-throw to maintain error propagation
    }
  }
  // Auto-save functionality with debouncing and race condition prevention
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isSavingRef = useRef(false)
  
  const debouncedSave = useCallback(async () => {
    if (isSavingRef.current || !isDirty) return
    
    isSavingRef.current = true
    try {
      const formData = form.getValues()
      await onSubmit(formData)
    } catch (error) {
      console.error("Auto-save failed:", error)
      // Don't show error toast for auto-save failures to avoid spam
    } finally {
      isSavingRef.current = false
    }
  }, [isDirty, form, onSubmit])

  useEffect(() => {
    if (!isDirty) return

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(() => {
      debouncedSave()
    }, 3000) // Increased to 3 seconds to reduce API calls

    // Cleanup on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [watch(), debouncedSave])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center justify-between sticky top-0 bg-white z-10 py-2 border-b">
        <div>
          <h2 className="text-xl font-semibold">Edit Resume</h2>
          <p className="text-sm text-gray-600">
            Changes are auto-saved. {isDirty && "(Unsaved changes)"}
          </p>
        </div>
        <Button 
          type="submit" 
          disabled={isSaving || !isDirty}
          size="sm"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-6 pr-4">
          {/* Contact Information */}
          <ContactInfoEditor form={form} />

          {/* Professional Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Professional Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="summary">Summary</Label>
                <Textarea
                  id="summary"
                  {...form.register("summary")}
                  placeholder="Write a brief professional summary highlighting your key qualifications and career objectives..."
                  rows={4}
                />
                <p className="text-xs text-gray-500">
                  Keep it concise and relevant to your target role (2-3 sentences recommended)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Work Experience */}
          <WorkExperienceEditor form={form} />

          {/* Education */}
          <EducationEditor form={form} />

          {/* Skills */}
          <SkillsEditor form={form} />

          {/* Certifications */}
          <CertificationsEditor form={form} />

          {/* Debug errors in development */}
          {Object.keys(errors).length > 0 && process.env.NODE_ENV === 'development' && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600">Form Errors (Dev Only)</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs text-red-600">
                  {JSON.stringify(errors, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </form>
  )
}