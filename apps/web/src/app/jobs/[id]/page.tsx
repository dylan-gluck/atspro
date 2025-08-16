'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Building2,
  MapPin,
  DollarSign,
  ExternalLink,
  Calendar,
  AlertTriangle,
  ArrowLeft,
  FileText,
  Target,
  Building,
  GraduationCap
} from 'lucide-react';
import Link from 'next/link';
import { getServicesSync } from '@/lib/services';
import type { JobEntity, JobDocument } from '@/types/services';
import { JobStatusSelector } from '@/components/job-status-selector';
import { JobActionButtons } from '@/components/job-action-buttons';
import { JobDocumentsList } from '@/components/job-documents-list';

export default function JobDetailsPage() {
  const params = useParams();
  const jobId = params?.id as string;

  const [job, setJob] = useState<JobEntity | null>(null);
  const [documents, setDocuments] = useState<JobDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const { jobsService } = getServicesSync();

  const loadJobDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load job details and documents in parallel
      const [jobResponse, documentsResponse] = await Promise.all([
        jobsService.getJob(jobId),
        jobsService.getDocuments(jobId)
      ]);

      if (!jobResponse.success) {
        throw new Error(jobResponse.message || 'Failed to load job details');
      }

      if (!documentsResponse.success) {
        console.warn('Failed to load documents:', documentsResponse.message);
        // Don't throw error for documents, just log warning
      }

      setJob(jobResponse.data);
      setDocuments(documentsResponse.success ? documentsResponse.data : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [jobId, jobsService]);

  useEffect(() => {
    if (!jobId) return;
    
    loadJobDetails();
  }, [jobId, loadJobDetails]);

  const handleStatusUpdate = async (status: JobEntity['status_info']['status']) => {
    if (!job) return;

    try {
      setIsUpdatingStatus(true);
      
      const response = await jobsService.updateStatus(job.id, {
        status,
        application_date: status === 'applied' ? new Date().toISOString() : job.status_info.application_date
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to update status');
      }

      setJob(response.data);
      toast.success(`Status updated to ${status}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update status';
      toast.error(message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDocumentsUpdate = () => {
    // Reload documents when they change
    loadJobDetails();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return <JobDetailsLoadingSkeleton />;
  }

  if (error || !job) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error || 'Job not found'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <div className="text-sm text-muted-foreground">
          Added {formatDate(job.created_at)}
        </div>
      </div>

      {/* Job Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="space-y-2 flex-1">
              <CardTitle className="text-2xl lg:text-3xl">{job.title}</CardTitle>
              <CardDescription className="flex items-center gap-2 text-lg">
                <Building2 className="w-5 h-5" />
                {job.company}
              </CardDescription>
            </div>
            <div className="flex flex-col lg:items-end gap-3">
              <JobStatusSelector
                currentStatus={job.status_info.status}
                onStatusChange={handleStatusUpdate}
                disabled={isUpdatingStatus}
              />
              {job.job_details.link && (
                <Button variant="outline" size="sm" asChild>
                  <a 
                    href={job.job_details.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Original Posting
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {job.job_details.location && job.job_details.location.length > 0 && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{job.job_details.location.join(', ')}</span>
              </div>
            )}
            {job.job_details.salary && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{job.job_details.salary}</span>
              </div>
            )}
            {job.status_info.application_date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>Applied {formatDate(job.status_info.application_date)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <JobActionButtons 
        jobId={job.id} 
        onDocumentsUpdate={handleDocumentsUpdate}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Job Details */}
        <div className="space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Job Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {job.job_details.description}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Responsibilities */}
          {job.job_details.responsibilities && job.job_details.responsibilities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Responsibilities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {job.job_details.responsibilities.map((responsibility, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                      <span>{responsibility}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Qualifications */}
          {job.job_details.qualifications && job.job_details.qualifications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Qualifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {job.job_details.qualifications.map((qualification, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                      <span>{qualification}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Additional Info */}
          {job.job_details.additional_info && job.job_details.additional_info.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Additional Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {job.job_details.additional_info.map((info, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                      <span>{info}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Documents */}
        <div>
          <JobDocumentsList 
            jobId={job.id} 
            documents={documents} 
            onDocumentsUpdate={handleDocumentsUpdate}
          />
        </div>
      </div>
    </div>
  );
}

function JobDetailsLoadingSkeleton() {
  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Job Header */}
      <Card>
        <CardHeader>
          <div className="space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-6 w-1/2" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}