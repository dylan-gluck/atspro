"use client"

import { Control, FieldPath, UseFormReturn } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2 } from "lucide-react"
import { ContactInfo, Resume } from "@/types/resume"

interface ContactInfoEditorProps {
  form: UseFormReturn<Resume>
}

export function ContactInfoEditor({ form }: ContactInfoEditorProps) {
  const { register, control, watch, setValue, formState: { errors } } = form
  const contactInfo = watch("contact_info")

  const addLink = () => {
    const currentLinks = contactInfo.links || []
    setValue("contact_info.links", [...currentLinks, { name: "", url: "" }])
  }

  const removeLink = (index: number) => {
    const currentLinks = contactInfo.links || []
    setValue("contact_info.links", currentLinks.filter((_, i) => i !== index))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name *</Label>
            <Input
              id="full_name"
              {...register("contact_info.full_name", { 
                required: "Full name is required" 
              })}
              placeholder="Enter your full name"
            />
            {errors.contact_info?.full_name && (
              <p className="text-sm text-red-500">
                {errors.contact_info.full_name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("contact_info.email", {
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Invalid email address"
                }
              })}
              placeholder="your.email@example.com"
            />
            {errors.contact_info?.email && (
              <p className="text-sm text-red-500">
                {errors.contact_info.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              {...register("contact_info.phone")}
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              {...register("contact_info.address")}
              placeholder="City, State, Country"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Links</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLink}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Link
            </Button>
          </div>

          {contactInfo.links.map((link, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-end">
              <div className="space-y-2">
                <Label htmlFor={`link_name_${index}`}>Link Name</Label>
                <Input
                  id={`link_name_${index}`}
                  {...register(`contact_info.links.${index}.name` as FieldPath<Resume>)}
                  placeholder="LinkedIn, Portfolio, GitHub..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`link_url_${index}`}>URL</Label>
                <div className="flex gap-2">
                  <Input
                    id={`link_url_${index}`}
                    {...register(`contact_info.links.${index}.url` as FieldPath<Resume>)}
                    placeholder="https://..."
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeLink(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}