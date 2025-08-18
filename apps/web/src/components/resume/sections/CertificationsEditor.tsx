"use client"

import { UseFormReturn, FieldPath } from "react-hook-form"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, GripVertical } from "lucide-react"
import { Resume, Certification } from "@/types/resume"

interface CertificationsEditorProps {
  form: UseFormReturn<Resume>
}

interface SortableCertificationItemProps {
  certification: Certification
  index: number
  form: UseFormReturn<Resume>
  onRemove: (index: number) => void
}

function SortableCertificationItem({ 
  certification, 
  index, 
  form, 
  onRemove 
}: SortableCertificationItemProps) {
  const { register } = form
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `certification-${index}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Card ref={setNodeRef} style={style} className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {certification.name || `Certification ${index + 1}`}
          </CardTitle>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
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
            <Label htmlFor={`cert_name_${index}`}>Certification Name *</Label>
            <Input
              id={`cert_name_${index}`}
              {...register(`certifications.${index}.name` as FieldPath<Resume>, {
                required: "Certification name is required"
              })}
              placeholder="AWS Certified Solutions Architect"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`cert_issuer_${index}`}>Issuer *</Label>
            <Input
              id={`cert_issuer_${index}`}
              {...register(`certifications.${index}.issuer` as FieldPath<Resume>, {
                required: "Issuer is required"
              })}
              placeholder="Amazon Web Services"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`cert_date_obtained_${index}`}>Date Obtained</Label>
            <Input
              id={`cert_date_obtained_${index}`}
              type="date"
              {...register(`certifications.${index}.date_obtained` as FieldPath<Resume>)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`cert_expiration_${index}`}>Expiration Date</Label>
            <Input
              id={`cert_expiration_${index}`}
              type="date"
              {...register(`certifications.${index}.expiration_date` as FieldPath<Resume>)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor={`cert_credential_id_${index}`}>Credential ID</Label>
            <Input
              id={`cert_credential_id_${index}`}
              {...register(`certifications.${index}.credential_id` as FieldPath<Resume>)}
              placeholder="Certificate or badge ID"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function CertificationsEditor({ form }: CertificationsEditorProps) {
  const { watch, setValue } = form
  const certifications = watch("certifications") || []

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const addCertification = () => {
    const newCertification: Certification = {
      name: "",
      issuer: "",
      date_obtained: null,
      expiration_date: null,
      credential_id: null
    }
    setValue("certifications", [...certifications, newCertification])
  }

  const removeCertification = (index: number) => {
    setValue("certifications", certifications.filter((_, i) => i !== index))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = certifications.findIndex((_, i) => `certification-${i}` === active.id)
      const newIndex = certifications.findIndex((_, i) => `certification-${i}` === over?.id)

      setValue("certifications", arrayMove(certifications, oldIndex, newIndex))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Certifications</h3>
        <Button type="button" onClick={addCertification}>
          <Plus className="h-4 w-4 mr-2" />
          Add Certification
        </Button>
      </div>

      {certifications.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No certifications added yet.</p>
            <Button type="button" onClick={addCertification} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Certification
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={certifications.map((_, i) => `certification-${i}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {certifications.map((certification, index) => (
                <SortableCertificationItem
                  key={`certification-${index}`}
                  certification={certification}
                  index={index}
                  form={form}
                  onRemove={removeCertification}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}