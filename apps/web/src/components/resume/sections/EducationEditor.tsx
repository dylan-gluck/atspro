"use client"

import { useState } from "react"
import { UseFormReturn, FieldPath } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, ChevronUp, ChevronDown, X } from "lucide-react"
import { Resume, Education } from "@/types/resume"

interface EducationEditorProps {
  form: UseFormReturn<Resume>
}

interface EducationItemProps {
  education: Education
  index: number
  form: UseFormReturn<Resume>
  onRemove: (index: number) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  isFirst: boolean
  isLast: boolean
}

function EducationItem({ 
  education, 
  index, 
  form, 
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast
}: EducationItemProps) {
  const [newHonor, setNewHonor] = useState("")
  const [newCourse, setNewCourse] = useState("")
  const { register, watch, setValue } = form
  const educationList = watch("education")

  const addHonor = () => {
    if (newHonor.trim()) {
      const currentHonors = educationList[index].honors || []
      setValue(
        `education.${index}.honors` as FieldPath<Resume>,
        [...currentHonors, newHonor.trim()]
      )
      setNewHonor("")
    }
  }

  const removeHonor = (honorIndex: number) => {
    const currentHonors = educationList[index].honors || []
    setValue(
      `education.${index}.honors` as FieldPath<Resume>,
      currentHonors.filter((_, i) => i !== honorIndex)
    )
  }

  const addCourse = () => {
    if (newCourse.trim()) {
      const currentCourses = educationList[index].relevant_courses || []
      if (!currentCourses.includes(newCourse.trim())) {
        setValue(
          `education.${index}.relevant_courses` as FieldPath<Resume>,
          [...currentCourses, newCourse.trim()]
        )
        setNewCourse("")
      }
    }
  }

  const removeCourse = (courseToRemove: string) => {
    const currentCourses = educationList[index].relevant_courses || []
    setValue(
      `education.${index}.relevant_courses` as FieldPath<Resume>,
      currentCourses.filter(course => course !== courseToRemove)
    )
  }

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {education.degree || `Education ${index + 1}`}
          </CardTitle>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onMoveUp(index)}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            )}
            {!isLast && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onMoveDown(index)}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            )}
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
            <Label htmlFor={`degree_${index}`}>Degree *</Label>
            <Input
              id={`degree_${index}`}
              {...register(`education.${index}.degree` as FieldPath<Resume>, {
                required: "Degree is required"
              })}
              placeholder="Bachelor's, Master's, PhD, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`field_of_study_${index}`}>Field of Study</Label>
            <Input
              id={`field_of_study_${index}`}
              {...register(`education.${index}.field_of_study` as FieldPath<Resume>)}
              placeholder="Computer Science, Business, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`institution_${index}`}>Institution *</Label>
            <Input
              id={`institution_${index}`}
              {...register(`education.${index}.institution` as FieldPath<Resume>, {
                required: "Institution is required"
              })}
              placeholder="University or school name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`graduation_date_${index}`}>Graduation Date</Label>
            <Input
              id={`graduation_date_${index}`}
              type="date"
              {...register(`education.${index}.graduation_date` as FieldPath<Resume>)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`gpa_${index}`}>GPA</Label>
            <Input
              id={`gpa_${index}`}
              type="number"
              step="0.01"
              min="0"
              max="4"
              {...register(`education.${index}.gpa` as FieldPath<Resume>, {
                valueAsNumber: true,
                min: { value: 0, message: "GPA must be positive" },
                max: { value: 4, message: "GPA must not exceed 4.0" }
              })}
              placeholder="3.75"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Honors & Awards</Label>
            <div className="flex gap-2">
              <Input
                value={newHonor}
                onChange={(e) => setNewHonor(e.target.value)}
                placeholder="Add an honor or award"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addHonor()
                  }
                }}
              />
              <Button
                type="button"
                onClick={addHonor}
                disabled={!newHonor.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {education.honors?.map((honor, honorIndex) => (
              <div key={honorIndex} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <span className="flex-1 text-sm">{honor}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeHonor(honorIndex)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Relevant Courses</Label>
            <div className="flex gap-2">
              <Input
                value={newCourse}
                onChange={(e) => setNewCourse(e.target.value)}
                placeholder="Add a relevant course"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addCourse()
                  }
                }}
              />
              <Button
                type="button"
                onClick={addCourse}
                disabled={!newCourse.trim() || education.relevant_courses?.includes(newCourse.trim())}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {education.relevant_courses && education.relevant_courses.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {education.relevant_courses.map((course, courseIndex) => (
                  <span
                    key={courseIndex}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                  >
                    {course}
                    <button
                      type="button"
                      onClick={() => removeCourse(course)}
                      className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function EducationEditor({ form }: EducationEditorProps) {
  const { watch, setValue } = form
  const education = watch("education") || []

  const addEducation = () => {
    const newEducation: Education = {
      institution: "",
      degree: "",
      field_of_study: null,
      graduation_date: null,
      gpa: null,
      honors: [],
      relevant_courses: [],
      skills: []
    }
    setValue("education", [...education, newEducation])
  }

  const removeEducation = (index: number) => {
    setValue("education", education.filter((_, i) => i !== index))
  }

  const moveEducationUp = (index: number) => {
    if (index > 0) {
      const newEducation = [...education]
      const [item] = newEducation.splice(index, 1)
      newEducation.splice(index - 1, 0, item)
      setValue("education", newEducation)
    }
  }

  const moveEducationDown = (index: number) => {
    if (index < education.length - 1) {
      const newEducation = [...education]
      const [item] = newEducation.splice(index, 1)
      newEducation.splice(index + 1, 0, item)
      setValue("education", newEducation)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Education</h3>
        <Button type="button" onClick={addEducation}>
          <Plus className="h-4 w-4 mr-2" />
          Add Education
        </Button>
      </div>

      {education.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No education added yet.</p>
            <Button type="button" onClick={addEducation} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Education
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {education.map((edu, index) => (
            <EducationItem
              key={`education-${index}`}
              education={edu}
              index={index}
              form={form}
              onRemove={removeEducation}
              onMoveUp={moveEducationUp}
              onMoveDown={moveEducationDown}
              isFirst={index === 0}
              isLast={index === education.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}