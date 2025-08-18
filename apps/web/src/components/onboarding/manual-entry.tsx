'use client';

import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronLeft, ChevronRight, Check, FileText, User, Briefcase, GraduationCap, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ContactInfoForm } from './resume-form/contact-info-form';
import { WorkExperienceForm } from './resume-form/work-experience-form';
import { EducationForm } from './resume-form/education-form';
import { SkillsForm } from './resume-form/skills-form';
import { Resume } from '@/types/resume';

const LinkSchema = z.object({
  name: z.string(),
  url: z.string().url().optional().or(z.literal('')),
});

const ContactInfoSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  links: z.array(LinkSchema).default([]),
});

const WorkExperienceSchema = z.object({
  company: z.string().min(1, 'Company name is required'),
  position: z.string().min(1, 'Position is required'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  is_current: z.boolean().optional().default(false),
  description: z.string().optional(),
  responsibilities: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
});

const EducationSchema = z.object({
  institution: z.string().min(1, 'Institution name is required'),
  degree: z.string().min(1, 'Degree is required'),
  field_of_study: z.string().optional(),
  graduation_date: z.string().optional(),
  gpa: z.number().min(0).max(4).optional().nullable(),
  honors: z.array(z.string()).default([]),
  relevant_courses: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
});

const CertificationSchema = z.object({
  name: z.string().min(1, 'Certification name is required'),
  issuer: z.string().min(1, 'Issuer is required'),
  date_obtained: z.string().optional(),
  expiration_date: z.string().optional(),
  credential_id: z.string().optional(),
});

const ResumeSchema = z.object({
  contact_info: ContactInfoSchema,
  summary: z.string().optional(),
  work_experience: z.array(WorkExperienceSchema).default([]),
  education: z.array(EducationSchema).default([]),
  certifications: z.array(CertificationSchema).default([]),
  skills: z.array(z.string()).default([]),
});

export interface ManualEntryProps {
  onComplete: (resumeData: Resume) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

const STEPS = [
  {
    id: 'contact',
    title: 'Contact Information',
    description: 'Basic contact details',
    icon: User,
  },
  {
    id: 'experience',
    title: 'Work Experience',
    description: 'Professional background',
    icon: Briefcase,
  },
  {
    id: 'education',
    title: 'Education',
    description: 'Academic background',
    icon: GraduationCap,
  },
  {
    id: 'skills',
    title: 'Skills & Certifications',
    description: 'Technical skills and certifications',
    icon: Award,
  },
];

export function ManualEntry({ onComplete, isLoading = false, error = null }: ManualEntryProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const methods = useForm<Resume>({
    resolver: zodResolver(ResumeSchema),
    defaultValues: {
      contact_info: {
        full_name: '',
        email: '',
        phone: '',
        address: '',
        links: [],
      },
      summary: '',
      work_experience: [],
      education: [],
      certifications: [],
      skills: [],
    },
    mode: 'onChange',
  });

  const {
    trigger,
    formState: { isValid },
    getValues,
  } = methods;

  const validateCurrentStep = async () => {
    let isStepValid = false;
    
    switch (currentStep) {
      case 0:
        isStepValid = await trigger('contact_info');
        break;
      case 1:
        isStepValid = await trigger('work_experience');
        break;
      case 2:
        isStepValid = await trigger('education');
        break;
      case 3:
        isStepValid = await trigger(['skills', 'certifications', 'summary']);
        break;
      default:
        isStepValid = true;
    }

    return isStepValid;
  };

  const handleNext = async () => {
    const isStepValid = await validateCurrentStep();
    
    if (isStepValid) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    // Allow going to completed steps or the next step
    if (completedSteps.has(stepIndex) || stepIndex <= Math.max(...completedSteps, -1) + 1) {
      setCurrentStep(stepIndex);
    }
  };

  const handleSubmit = async () => {
    const isFormValid = await trigger();
    if (isFormValid) {
      const formData = getValues();
      await onComplete(formData);
    }
  };

  const progress = ((completedSteps.size + (currentStep + 1)) / (STEPS.length + 1)) * 100;

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <ContactInfoForm />;
      case 1:
        return <WorkExperienceForm />;
      case 2:
        return <EducationForm />;
      case 3:
        return <SkillsForm />;
      default:
        return null;
    }
  };

  const isLastStep = currentStep === STEPS.length - 1;
  const canGoNext = currentStep < STEPS.length - 1;

  return (
    <FormProvider {...methods}>
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <FileText className="w-6 h-6" />
              Create Your Resume
            </CardTitle>
            <CardDescription>
              Fill out your information step by step to create your professional resume
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Progress</span>
                <span className="text-muted-foreground">
                  Step {currentStep + 1} of {STEPS.length}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Step Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = completedSteps.has(index);
            const isCurrent = index === currentStep;
            const isAccessible = completedSteps.has(index) || index <= Math.max(...completedSteps, -1) + 1;

            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(index)}
                disabled={!isAccessible}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  isCurrent
                    ? 'border-primary bg-primary/5 text-primary'
                    : isCompleted
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : isAccessible
                    ? 'border-border hover:border-primary hover:bg-primary/5'
                    : 'border-muted text-muted-foreground cursor-not-allowed opacity-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  <span className="font-medium text-sm">{step.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </button>
            );
          })}
        </div>

        {/* Form Content */}
        <div className="min-h-[600px]">
          {renderStepContent()}
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="pt-6">
              <p className="text-destructive text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0 || isLoading}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>

              <div className="flex items-center gap-2">
                {canGoNext ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={isLoading}
                    className="flex items-center gap-1"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isLoading || !isValid}
                    className="flex items-center gap-1"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creating Resume...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Complete Resume
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </FormProvider>
  );
}