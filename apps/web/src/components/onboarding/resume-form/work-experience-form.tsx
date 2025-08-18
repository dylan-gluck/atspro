'use client';

import React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Plus, X, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export function WorkExperienceForm() {
  const {
    register,
    formState: { errors },
    control,
    watch,
    setValue,
  } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'work_experience',
  });

  const addWorkExperience = () => {
    append({
      company: '',
      position: '',
      start_date: '',
      end_date: '',
      is_current: false,
      description: '',
      responsibilities: [],
      skills: [],
    });
  };

  const addResponsibility = (workIndex: number) => {
    const currentResponsibilities = watch(`work_experience.${workIndex}.responsibilities`) || [];
    setValue(`work_experience.${workIndex}.responsibilities`, [...currentResponsibilities, '']);
  };

  const removeResponsibility = (workIndex: number, responsibilityIndex: number) => {
    const currentResponsibilities = watch(`work_experience.${workIndex}.responsibilities`) || [];
    const updated = currentResponsibilities.filter((_: any, index: number) => index !== responsibilityIndex);
    setValue(`work_experience.${workIndex}.responsibilities`, updated);
  };

  const addSkill = (workIndex: number) => {
    const currentSkills = watch(`work_experience.${workIndex}.skills`) || [];
    setValue(`work_experience.${workIndex}.skills`, [...currentSkills, '']);
  };

  const removeSkill = (workIndex: number, skillIndex: number) => {
    const currentSkills = watch(`work_experience.${workIndex}.skills`) || [];
    const updated = currentSkills.filter((_: any, index: number) => index !== skillIndex);
    setValue(`work_experience.${workIndex}.skills`, updated);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="w-5 h-5" />
          Work Experience
        </CardTitle>
        <CardDescription>
          Add your professional work experience, starting with your most recent position
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {fields.length === 0 && (
          <div className="text-center py-8">
            <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No work experience added yet</p>
            <Button onClick={addWorkExperience} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add First Work Experience
            </Button>
          </div>
        )}

        {fields.map((field, workIndex) => {
          const watchedIsCurrent = watch(`work_experience.${workIndex}.is_current`);
          const responsibilities = watch(`work_experience.${workIndex}.responsibilities`) || [];
          const skills = watch(`work_experience.${workIndex}.skills`) || [];

          return (
            <div key={field.id} className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-lg">
                  {workIndex === 0 ? 'Current/Most Recent Position' : `Position ${workIndex + 1}`}
                </h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => remove(workIndex)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`company-${workIndex}`}>Company *</Label>
                  <Input
                    id={`company-${workIndex}`}
                    {...register(`work_experience.${workIndex}.company`, {
                      required: 'Company name is required',
                    })}
                    placeholder="Company Name"
                  />
                  {errors.work_experience?.[workIndex]?.company && (
                    <p className="text-sm text-destructive">
                      {errors.work_experience[workIndex].company.message as string}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`position-${workIndex}`}>Position *</Label>
                  <Input
                    id={`position-${workIndex}`}
                    {...register(`work_experience.${workIndex}.position`, {
                      required: 'Position is required',
                    })}
                    placeholder="Job Title"
                  />
                  {errors.work_experience?.[workIndex]?.position && (
                    <p className="text-sm text-destructive">
                      {errors.work_experience[workIndex].position.message as string}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`start-date-${workIndex}`}>Start Date</Label>
                  <Input
                    id={`start-date-${workIndex}`}
                    type="month"
                    {...register(`work_experience.${workIndex}.start_date`)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`end-date-${workIndex}`}>End Date</Label>
                  <div className="space-y-2">
                    <Input
                      id={`end-date-${workIndex}`}
                      type="month"
                      {...register(`work_experience.${workIndex}.end_date`)}
                      disabled={watchedIsCurrent}
                    />
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`is-current-${workIndex}`}
                        checked={watchedIsCurrent}
                        onCheckedChange={(checked) => {
                          setValue(`work_experience.${workIndex}.is_current`, checked);
                          if (checked) {
                            setValue(`work_experience.${workIndex}.end_date`, '');
                          }
                        }}
                      />
                      <Label htmlFor={`is-current-${workIndex}`} className="text-sm">
                        I currently work here
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`description-${workIndex}`}>Job Description</Label>
                <Textarea
                  id={`description-${workIndex}`}
                  {...register(`work_experience.${workIndex}.description`)}
                  placeholder="Brief description of your role and the company..."
                  rows={3}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Key Responsibilities</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addResponsibility(workIndex)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
                {responsibilities.map((_: any, respIndex: number) => (
                  <div key={respIndex} className="flex gap-2">
                    <Input
                      {...register(`work_experience.${workIndex}.responsibilities.${respIndex}`)}
                      placeholder="Describe a key responsibility or achievement..."
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeResponsibility(workIndex, respIndex)}
                      className="px-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {responsibilities.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Add key responsibilities and achievements from this role
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Skills Used</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSkill(workIndex)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
                {skills.map((_: any, skillIndex: number) => (
                  <div key={skillIndex} className="flex gap-2">
                    <Input
                      {...register(`work_experience.${workIndex}.skills.${skillIndex}`)}
                      placeholder="e.g., Python, React, Project Management..."
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeSkill(workIndex, skillIndex)}
                      className="px-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {skills.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Add technologies, tools, and skills you used in this role
                  </p>
                )}
              </div>

              {workIndex < fields.length - 1 && <Separator className="my-6" />}
            </div>
          );
        })}

        {fields.length > 0 && (
          <div className="flex justify-center">
            <Button onClick={addWorkExperience} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Another Position
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}