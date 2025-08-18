"use client"

import { useState } from "react"
import { UseFormReturn, FieldPath } from "react-hook-form"
// Temporarily removed drag-and-drop to fix build issue
// import {
//   DndContext,
//   closestCenter,
//   KeyboardSensor,
//   PointerSensor,
//   useSensor,
//   useSensors,
//   DragEndEvent,
// } from "@dnd-kit/core"
// import {
//   arrayMove,
//   SortableContext,
//   sortableKeyboardCoordinates,
//   verticalListSortingStrategy,
// } from "@dnd-kit/sortable"
// import {
//   useSortable,
// } from "@dnd-kit/sortable"
// import { CSS } from "@dnd-kit/utilities"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, ChevronUp, ChevronDown, X } from "lucide-react"
import { Resume, WorkExperience } from "@/types/resume"

interface WorkExperienceEditorProps {
  form: UseFormReturn<Resume>
}

interface WorkExperienceItemProps {
  experience: WorkExperience
  index: number
  form: UseFormReturn<Resume>
  onRemove: (index: number) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  isFirst: boolean
  isLast: boolean
}

function WorkExperienceItem({ 
  experience, 
  index, 
  form, 
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast
}: WorkExperienceItemProps) {
  const [newResponsibility, setNewResponsibility] = useState("")
  const [newSkill, setNewSkill] = useState("")
  const { register, watch, setValue } = form
  const workExperience = watch("work_experience")

  const addResponsibility = () => {
    if (newResponsibility.trim()) {
      const currentResponsibilities = workExperience[index].responsibilities || []
      setValue(
        `work_experience.${index}.responsibilities` as FieldPath<Resume>,
        [...currentResponsibilities, newResponsibility.trim()]
      )
      setNewResponsibility("")
    }
  }

  const removeResponsibility = (respIndex: number) => {
    const currentResponsibilities = workExperience[index].responsibilities || []
    setValue(
      `work_experience.${index}.responsibilities` as FieldPath<Resume>,
      currentResponsibilities.filter((_, i) => i !== respIndex)
    )
  }

  const addSkill = () => {
    if (newSkill.trim()) {
      const currentSkills = workExperience[index].skills || []
      if (!currentSkills.includes(newSkill.trim())) {
        setValue(
          `work_experience.${index}.skills` as FieldPath<Resume>,
          [...currentSkills, newSkill.trim()]
        )
        setNewSkill("")
      }
    }
  }

  const removeSkill = (skillToRemove: string) => {
    const currentSkills = workExperience[index].skills || []
    setValue(
      `work_experience.${index}.skills` as FieldPath<Resume>,
      currentSkills.filter(skill => skill !== skillToRemove)
    )
  }

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {experience.position || `Experience ${index + 1}`}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onMoveUp(index)}
              disabled={isFirst}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onMoveDown(index)}
              disabled={isLast}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onRemove(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`position_${index}`}>Position *</Label>
            <Input
              id={`position_${index}`}
              {...register(`work_experience.${index}.position` as FieldPath<Resume>, {
                required: "Position is required"
              })}
              placeholder="Job title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`company_${index}`}>Company *</Label>
            <Input
              id={`company_${index}`}
              {...register(`work_experience.${index}.company` as FieldPath<Resume>, {
                required: "Company is required"
              })}
              placeholder="Company name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`start_date_${index}`}>Start Date</Label>
            <Input
              id={`start_date_${index}`}
              type="date"
              {...register(`work_experience.${index}.start_date` as FieldPath<Resume>)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`end_date_${index}`}>End Date</Label>
            <Input
              id={`end_date_${index}`}
              type="date"
              {...register(`work_experience.${index}.end_date` as FieldPath<Resume>)}
              disabled={watch(`work_experience.${index}.is_current`)}
            />
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`is_current_${index}`}
                checked={watch(`work_experience.${index}.is_current`) || false}
                onCheckedChange={(checked) => 
                  setValue(`work_experience.${index}.is_current` as FieldPath<Resume>, checked as boolean)
                }
              />
              <Label htmlFor={`is_current_${index}`} className="text-sm">
                Current position
              </Label>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`description_${index}`}>Description</Label>
          <Textarea
            id={`description_${index}`}
            {...register(`work_experience.${index}.description` as FieldPath<Resume>)}
            placeholder="Brief overview of your role and responsibilities"
            rows={3}
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Responsibilities</Label>
            <div className="flex gap-2">
              <Input
                value={newResponsibility}
                onChange={(e) => setNewResponsibility(e.target.value)}
                placeholder="Add a responsibility"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addResponsibility()
                  }
                }}
              />
              <Button
                type="button"
                onClick={addResponsibility}
                disabled={!newResponsibility.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {experience.responsibilities?.map((resp, respIndex) => (
              <div key={respIndex} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <span className="flex-1 text-sm">{resp}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeResponsibility(respIndex)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Skills Used</Label>
            <div className="flex gap-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="Add a skill"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addSkill()
                  }
                }}
              />
              <Button
                type="button"
                onClick={addSkill}
                disabled={!newSkill.trim() || experience.skills?.includes(newSkill.trim())}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {experience.skills && experience.skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {experience.skills.map((skill, skillIndex) => (
                  <Badge
                    key={skillIndex}
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
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function WorkExperienceEditor({ form }: WorkExperienceEditorProps) {
  const { watch, setValue } = form
  const workExperience = watch("work_experience") || []

  const addExperience = () => {
    const newExperience: WorkExperience = {
      position: "",
      company: "",
      start_date: null,
      end_date: null,
      is_current: false,
      description: null,
      responsibilities: [],
      skills: []
    }
    setValue("work_experience", [...workExperience, newExperience])
  }

  const removeExperience = (index: number) => {
    setValue("work_experience", workExperience.filter((_, i) => i !== index))
  }

  const moveExperienceUp = (index: number) => {
    if (index === 0) return
    const newExperience = [...workExperience]
    const temp = newExperience[index]
    newExperience[index] = newExperience[index - 1]
    newExperience[index - 1] = temp
    setValue("work_experience", newExperience)
  }

  const moveExperienceDown = (index: number) => {
    if (index === workExperience.length - 1) return
    const newExperience = [...workExperience]
    const temp = newExperience[index]
    newExperience[index] = newExperience[index + 1]
    newExperience[index + 1] = temp
    setValue("work_experience", newExperience)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Work Experience</h3>
        <Button type="button" onClick={addExperience}>
          <Plus className="h-4 w-4 mr-2" />
          Add Experience
        </Button>
      </div>

      {workExperience.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No work experience added yet.</p>
            <Button type="button" onClick={addExperience} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Experience
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {workExperience.map((experience, index) => (
            <WorkExperienceItem
              key={`work-${index}`}
              experience={experience}
              index={index}
              form={form}
              onRemove={removeExperience}
              onMoveUp={moveExperienceUp}
              onMoveDown={moveExperienceDown}
              isFirst={index === 0}
              isLast={index === workExperience.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}