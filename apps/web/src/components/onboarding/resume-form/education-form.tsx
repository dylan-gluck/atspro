'use client';

import React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Plus, X, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export function EducationForm() {
  const {
    register,
    formState: { errors },
    control,
    watch,
    setValue,
  } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'education',
  });

  const addEducation = () => {
    append({
      institution: '',
      degree: '',
      field_of_study: '',
      graduation_date: '',
      gpa: null,
      honors: [],
      relevant_courses: [],
      skills: [],
    });
  };

  const addHonor = (eduIndex: number) => {
    const currentHonors = watch(`education.${eduIndex}.honors`) || [];
    setValue(`education.${eduIndex}.honors`, [...currentHonors, '']);
  };

  const removeHonor = (eduIndex: number, honorIndex: number) => {
    const currentHonors = watch(`education.${eduIndex}.honors`) || [];
    const updated = currentHonors.filter((_: any, index: number) => index !== honorIndex);
    setValue(`education.${eduIndex}.honors`, updated);
  };

  const addCourse = (eduIndex: number) => {
    const currentCourses = watch(`education.${eduIndex}.relevant_courses`) || [];
    setValue(`education.${eduIndex}.relevant_courses`, [...currentCourses, '']);
  };

  const removeCourse = (eduIndex: number, courseIndex: number) => {
    const currentCourses = watch(`education.${eduIndex}.relevant_courses`) || [];
    const updated = currentCourses.filter((_: any, index: number) => index !== courseIndex);
    setValue(`education.${eduIndex}.relevant_courses`, updated);
  };

  const addSkill = (eduIndex: number) => {
    const currentSkills = watch(`education.${eduIndex}.skills`) || [];
    setValue(`education.${eduIndex}.skills`, [...currentSkills, '']);
  };

  const removeSkill = (eduIndex: number, skillIndex: number) => {
    const currentSkills = watch(`education.${eduIndex}.skills`) || [];
    const updated = currentSkills.filter((_: any, index: number) => index !== skillIndex);
    setValue(`education.${eduIndex}.skills`, updated);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5" />
          Education
        </CardTitle>
        <CardDescription>
          Add your educational background, starting with your highest degree
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {fields.length === 0 && (
          <div className="text-center py-8">
            <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No education added yet</p>
            <Button onClick={addEducation} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Education
            </Button>
          </div>
        )}

        {fields.map((field, eduIndex) => {
          const honors = watch(`education.${eduIndex}.honors`) || [];
          const courses = watch(`education.${eduIndex}.relevant_courses`) || [];
          const skills = watch(`education.${eduIndex}.skills`) || [];

          return (
            <div key={field.id} className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-lg">
                  {eduIndex === 0 ? 'Highest Degree' : `Education ${eduIndex + 1}`}
                </h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => remove(eduIndex)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`institution-${eduIndex}`}>Institution *</Label>
                  <Input
                    id={`institution-${eduIndex}`}
                    {...register(`education.${eduIndex}.institution`, {
                      required: 'Institution name is required',
                    })}
                    placeholder="University/College Name"
                  />
                  {errors.education?.[eduIndex]?.institution && (
                    <p className="text-sm text-destructive">
                      {errors.education[eduIndex].institution.message as string}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`degree-${eduIndex}`}>Degree *</Label>
                  <Input
                    id={`degree-${eduIndex}`}
                    {...register(`education.${eduIndex}.degree`, {
                      required: 'Degree is required',
                    })}
                    placeholder="Bachelor of Science, Master of Arts, etc."
                  />
                  {errors.education?.[eduIndex]?.degree && (
                    <p className="text-sm text-destructive">
                      {errors.education[eduIndex].degree.message as string}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`field-of-study-${eduIndex}`}>Field of Study</Label>
                  <Input
                    id={`field-of-study-${eduIndex}`}
                    {...register(`education.${eduIndex}.field_of_study`)}
                    placeholder="Computer Science, Business Administration, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`graduation-date-${eduIndex}`}>Graduation Date</Label>
                  <Input
                    id={`graduation-date-${eduIndex}`}
                    type="month"
                    {...register(`education.${eduIndex}.graduation_date`)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`gpa-${eduIndex}`}>GPA (Optional)</Label>
                <Input
                  id={`gpa-${eduIndex}`}
                  type="number"
                  step="0.01"
                  min="0"
                  max="4"
                  {...register(`education.${eduIndex}.gpa`, {
                    valueAsNumber: true,
                    min: { value: 0, message: 'GPA must be positive' },
                    max: { value: 4, message: 'GPA cannot exceed 4.0' },
                  })}
                  placeholder="3.75"
                />
                {errors.education?.[eduIndex]?.gpa && (
                  <p className="text-sm text-destructive">
                    {errors.education[eduIndex].gpa.message as string}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Honors & Awards</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addHonor(eduIndex)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
                {honors.map((_: any, honorIndex: number) => (
                  <div key={honorIndex} className="flex gap-2">
                    <Input
                      {...register(`education.${eduIndex}.honors.${honorIndex}`)}
                      placeholder="Magna Cum Laude, Dean's List, etc."
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeHonor(eduIndex, honorIndex)}
                      className="px-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {honors.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Add any academic honors, awards, or distinctions
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Relevant Courses</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addCourse(eduIndex)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
                {courses.map((_: any, courseIndex: number) => (
                  <div key={courseIndex} className="flex gap-2">
                    <Input
                      {...register(`education.${eduIndex}.relevant_courses.${courseIndex}`)}
                      placeholder="Data Structures, Machine Learning, etc."
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeCourse(eduIndex, courseIndex)}
                      className="px-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {courses.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Add relevant coursework for your field
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Skills Learned</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSkill(eduIndex)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
                {skills.map((_: any, skillIndex: number) => (
                  <div key={skillIndex} className="flex gap-2">
                    <Input
                      {...register(`education.${eduIndex}.skills.${skillIndex}`)}
                      placeholder="Programming, Research, Analysis, etc."
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeSkill(eduIndex, skillIndex)}
                      className="px-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {skills.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Add skills and competencies gained through your education
                  </p>
                )}
              </div>

              {eduIndex < fields.length - 1 && <Separator className="my-6" />}
            </div>
          );
        })}

        {fields.length > 0 && (
          <div className="flex justify-center">
            <Button onClick={addEducation} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Another Education
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}