"use client"

import { useState } from "react"
import { UseFormReturn } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, X } from "lucide-react"
import { Resume } from "@/types/resume"

interface SkillsEditorProps {
  form: UseFormReturn<Resume>
}

export function SkillsEditor({ form }: SkillsEditorProps) {
  const { watch, setValue } = form
  const [newSkill, setNewSkill] = useState("")
  const skills = watch("skills") || []

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setValue("skills", [...skills, newSkill.trim()])
      setNewSkill("")
    }
  }

  const removeSkill = (skillToRemove: string) => {
    setValue("skills", skills.filter(skill => skill !== skillToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addSkill()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Skills</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="new_skill">Add Skill</Label>
            <Input
              id="new_skill"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter a skill and press Enter"
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              onClick={addSkill}
              disabled={!newSkill.trim() || skills.includes(newSkill.trim())}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </div>

        {skills.length > 0 && (
          <div className="space-y-2">
            <Label>Current Skills</Label>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="flex items-center gap-1 pl-3 pr-1"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {skills.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            No skills added yet. Add skills that are relevant to your profession.
          </p>
        )}
      </CardContent>
    </Card>
  )
}