'use client';

import React, { useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Plus, X, Settings, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export function SkillsForm() {
  const {
    register,
    formState: { errors },
    control,
    watch,
    setValue,
  } = useFormContext();

  const { fields: certificationFields, append: appendCertification, remove: removeCertification } = useFieldArray({
    control,
    name: 'certifications',
  });

  const [newSkill, setNewSkill] = useState('');
  const skills = watch('skills') || [];

  const addSkill = () => {
    if (newSkill.trim()) {
      const currentSkills = skills;
      if (!currentSkills.includes(newSkill.trim())) {
        setValue('skills', [...currentSkills, newSkill.trim()]);
        setNewSkill('');
      }
    }
  };

  const removeSkill = (index: number) => {
    const currentSkills = skills;
    const updated = currentSkills.filter((_: any, i: number) => i !== index);
    setValue('skills', updated);
  };

  const addCertification = () => {
    appendCertification({
      name: '',
      issuer: '',
      date_obtained: '',
      expiration_date: '',
      credential_id: '',
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  return (
    <div className="space-y-6">
      {/* Skills Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Skills
          </CardTitle>
          <CardDescription>
            Add your technical and professional skills
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="summary">Professional Summary (Optional)</Label>
            <Textarea
              id="summary"
              {...register('summary')}
              placeholder="Brief summary of your professional background and key qualifications..."
              rows={4}
            />
            <p className="text-sm text-muted-foreground">
              A concise overview of your experience and what makes you unique
            </p>
          </div>

          <Separator />

          <div className="space-y-4">
            <Label>Technical & Professional Skills</Label>
            
            <div className="flex gap-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a skill and press Enter or click Add"
                className="flex-1"
              />
              <Button type="button" onClick={addSkill} variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>

            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill: string, index: number) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="text-sm py-1 px-2 flex items-center gap-1"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(index)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {skills.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No skills added yet</p>
                <p className="text-sm">Add programming languages, tools, frameworks, and soft skills</p>
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Examples of skills to add:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="font-medium">Technical:</p>
                  <p>JavaScript, Python, React, AWS, Docker, SQL</p>
                </div>
                <div>
                  <p className="font-medium">Professional:</p>
                  <p>Project Management, Team Leadership, Communication</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Certifications Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Certifications
          </CardTitle>
          <CardDescription>
            Add your professional certifications and credentials
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {certificationFields.length === 0 && (
            <div className="text-center py-8">
              <Award className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No certifications added yet</p>
              <Button onClick={addCertification} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Certification
              </Button>
            </div>
          )}

          {certificationFields.map((field, certIndex) => (
            <div key={field.id} className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-lg">Certification {certIndex + 1}</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeCertification(certIndex)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`cert-name-${certIndex}`}>Certification Name *</Label>
                  <Input
                    id={`cert-name-${certIndex}`}
                    {...register(`certifications.${certIndex}.name`, {
                      required: 'Certification name is required',
                    })}
                    placeholder="AWS Certified Solutions Architect"
                  />
                  {errors.certifications?.[certIndex]?.name && (
                    <p className="text-sm text-destructive">
                      {errors.certifications[certIndex].name.message as string}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`cert-issuer-${certIndex}`}>Issuing Organization *</Label>
                  <Input
                    id={`cert-issuer-${certIndex}`}
                    {...register(`certifications.${certIndex}.issuer`, {
                      required: 'Issuer is required',
                    })}
                    placeholder="Amazon Web Services"
                  />
                  {errors.certifications?.[certIndex]?.issuer && (
                    <p className="text-sm text-destructive">
                      {errors.certifications[certIndex].issuer.message as string}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`cert-date-${certIndex}`}>Date Obtained</Label>
                  <Input
                    id={`cert-date-${certIndex}`}
                    type="month"
                    {...register(`certifications.${certIndex}.date_obtained`)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`cert-expiry-${certIndex}`}>Expiration Date (if applicable)</Label>
                  <Input
                    id={`cert-expiry-${certIndex}`}
                    type="month"
                    {...register(`certifications.${certIndex}.expiration_date`)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`cert-id-${certIndex}`}>Credential ID (Optional)</Label>
                <Input
                  id={`cert-id-${certIndex}`}
                  {...register(`certifications.${certIndex}.credential_id`)}
                  placeholder="Verification ID or license number"
                />
              </div>

              {certIndex < certificationFields.length - 1 && <Separator className="my-6" />}
            </div>
          ))}

          {certificationFields.length > 0 && (
            <div className="flex justify-center">
              <Button onClick={addCertification} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Another Certification
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}