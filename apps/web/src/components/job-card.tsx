'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ExternalLink, 
  Building2, 
  MapPin, 
  Calendar, 
  Archive, 
  ArchiveRestore,
  Eye,
  DollarSign
} from 'lucide-react';
import Link from 'next/link';
import type { JobEntity } from '@/types/services';

interface JobCardProps {
  job: JobEntity;
  onArchiveToggle: (jobId: string, isArchived: boolean) => void;
}

export function JobCard({ job, onArchiveToggle }: JobCardProps) {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'saved': return 'secondary';
      case 'applied': return 'default';
      case 'interviewing': return 'outline';
      case 'offered': return 'default';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isArchived = job.archived === true;

  return (
    <Card className={`h-full transition-all hover:shadow-md ${isArchived ? 'opacity-75' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg leading-tight">{job.title}</CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Building2 className="w-4 h-4 flex-shrink-0" />
              {job.company}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <Badge variant={getStatusBadgeVariant(job.status_info?.status || 'saved')}>
              {job.status_info?.status || 'saved'}
            </Badge>
            {isArchived && (
              <Badge variant="outline" className="text-xs">
                Archived
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {job.job_details.location && job.job_details.location.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{job.job_details.location.join(', ')}</span>
            </div>
          )}
          
          {job.job_details.salary && (
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <DollarSign className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{job.job_details.salary}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            Added {formatDate(job.created_at)}
          </div>

          {/* Job Description Preview */}
          {job.job_details.description && (
            <div className="text-sm text-muted-foreground">
              <p className="line-clamp-2">
                {job.job_details.description.substring(0, 120)}...
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="outline" className="flex-1" asChild>
              <Link href={`/jobs/${job.id}`}>
                <Eye className="w-4 h-4 mr-1" />
                View Details
              </Link>
            </Button>
            <div className="flex gap-1">
              {job.job_details.link && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  asChild
                  title="Open job posting"
                >
                  <a 
                    href={job.job_details.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label="Open external job link"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onArchiveToggle(job.id, isArchived)}
                title={isArchived ? 'Unarchive job' : 'Archive job'}
              >
                {isArchived ? (
                  <ArchiveRestore className="w-4 h-4" />
                ) : (
                  <Archive className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}