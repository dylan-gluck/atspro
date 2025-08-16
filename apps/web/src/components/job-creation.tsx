'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUpload } from '@/components/onboarding/file-upload';
import { useJobsService } from '@/lib/services';
import { toast } from 'sonner';
import { Loader2, Link as LinkIcon, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JobEntity } from '@/types/services';

export interface JobCreationProps {
  onJobCreated?: (job: JobEntity) => void;
  className?: string;
}

export function JobCreation({ onJobCreated, className }: JobCreationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [jobUrl, setJobUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'url' | 'document'>('url');
  
  const jobsService = useJobsService();

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!jobUrl.trim()) {
      setError('Please enter a job URL');
      return;
    }

    if (!jobsService) {
      setError('Jobs service is not available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await jobsService.createJob(jobUrl.trim());
      
      if (response.success) {
        toast.success('Job created successfully!');
        setJobUrl('');
        onJobCreated?.(response.data);
      } else {
        const errorMessage = response.message || 'Failed to create job';
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (err) {
      const errorMessage = 'An unexpected error occurred while creating the job';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Job creation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentUpload = async (file: File) => {
    if (!jobsService) {
      throw new Error('Jobs service is not available');
    }

    setError(null);
    
    try {
      const response = await jobsService.parseJobFromDocument(file);
      
      if (response.success) {
        toast.success('Job description parsed successfully!');
        onJobCreated?.(response.data);
      } else {
        const errorMessage = response.message || 'Failed to parse job document';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse job document';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };

  const isUrlValid = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Add New Job</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'url' | 'document')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url" className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              Job URL
            </TabsTrigger>
            <TabsTrigger value="document" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Document
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-4">
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="job-url">Job Posting URL</Label>
                <Input
                  id="job-url"
                  type="url"
                  placeholder="https://example.com/jobs/software-engineer"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  disabled={isLoading}
                  className={cn(
                    error && activeTab === 'url' && 'border-destructive focus-visible:ring-destructive'
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the URL of a job posting to automatically extract job details
                </p>
              </div>

              <Button 
                type="submit" 
                disabled={isLoading || !jobUrl.trim() || !isUrlValid(jobUrl)}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Parsing Job...
                  </>
                ) : (
                  'Create Job from URL'
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="document" className="space-y-4">
            <div className="space-y-2">
              <Label>Job Description Document</Label>
              <FileUpload
                onFileUpload={handleDocumentUpload}
                isLoading={isLoading}
                error={activeTab === 'document' ? error : null}
                accept={{
                  'application/pdf': ['.pdf'],
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                  'application/msword': ['.doc'],
                  'text/plain': ['.txt'],
                  'text/markdown': ['.md']
                }}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Upload a document containing the job description to automatically extract details
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Error display for URL tab */}
        {error && activeTab === 'url' && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}