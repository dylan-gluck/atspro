'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUpload, ProcessingStage } from '@/components/onboarding/file-upload';
import { useServices } from '@/lib/services';

export default function OnboardingPage() {
  const router = useRouter();
  const services = useServices();
  const [isLoading, setIsLoading] = useState(false);
  const [processingStage, setProcessingStage] = useState<ProcessingStage>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    if (!services) {
      setError('Services not available. Please refresh the page.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Stage 1: Uploading
      setProcessingStage('uploading');
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay to show upload stage
      
      // Stage 2: Parsing the resume
      setProcessingStage('parsing');
      const parseResponse = await services.resumeService.parseResume(file);
      
      if (!parseResponse.success) {
        throw new Error(parseResponse.message || 'Failed to parse resume. Please check your file and try again.');
      }

      const resumeData = parseResponse.data;
      
      // Stage 3: Updating profile
      if (resumeData && 'resume_id' in resumeData) {
        setProcessingStage('updating');
        const updateResponse = await services.userService.updateResumeId(resumeData.resume_id as string);
        
        if (!updateResponse.success) {
          throw new Error(updateResponse.message || 'Failed to update your profile. Please try again.');
        }
      }

      // Stage 4: Success
      setProcessingStage('success');
      
      // Brief success display before redirect
      setTimeout(() => {
        router.push('/');
      }, 1500);
      
    } catch (err) {
      console.error('Resume upload failed:', err);
      setProcessingStage('error');
      
      // Enhanced error messages based on stage
      let errorMessage = 'An unexpected error occurred';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      // Add context based on current stage
      if (processingStage === 'uploading') {
        errorMessage = `Upload failed: ${errorMessage}`;
      } else if (processingStage === 'parsing') {
        errorMessage = `Resume analysis failed: ${errorMessage}`;
      } else if (processingStage === 'updating') {
        errorMessage = `Profile update failed: ${errorMessage}`;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state if services are not ready
  if (!services) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-3xl font-bold mb-2">
              Welcome to ATSPro
            </CardTitle>
            <CardDescription className="text-lg">
              Let&apos;s start by uploading your resume to unlock the power of AI-driven optimization
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-8 pb-8">
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Upload Your Resume</h3>
                <p className="text-sm text-muted-foreground">
                  We&apos;ll analyze your resume and help you optimize it for any job application
                </p>
              </div>

              <FileUpload
                onFileUpload={handleFileUpload}
                isLoading={isLoading}
                processingStage={processingStage}
                error={error}
                disabled={isLoading}
                className="mx-auto"
              />

              <div className="text-center space-y-4">
                <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    <span>Secure upload</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span>AI-powered analysis</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full" />
                    <span>ATS optimization</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Your resume will be securely processed and stored. We use industry-standard encryption to protect your data.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional information */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="space-y-2">
            <h4 className="font-medium">Smart Parsing</h4>
            <p className="text-xs text-muted-foreground">
              Our AI extracts and structures your resume data accurately
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">ATS Optimization</h4>
            <p className="text-xs text-muted-foreground">
              Optimize your resume for Applicant Tracking Systems
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">Job Matching</h4>
            <p className="text-xs text-muted-foreground">
              Get tailored recommendations for each job application
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}