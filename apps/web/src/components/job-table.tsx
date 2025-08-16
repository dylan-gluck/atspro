'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  Archive, 
  ArchiveRestore,
  Eye 
} from 'lucide-react';
import type { JobEntity } from '@/types/services';

type SortField = 'date' | 'company' | 'title' | 'status';
type SortOrder = 'asc' | 'desc';

interface JobTableProps {
  jobs: JobEntity[];
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  onArchiveToggle: (jobId: string, isArchived: boolean) => void;
}

export function JobTable({ jobs, sortField, sortOrder, onSort, onArchiveToggle }: JobTableProps) {
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

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronDown className="w-4 h-4 opacity-50" />;
    }
    return sortOrder === 'asc' ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />;
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead>
      <button
        onClick={() => onSort(field)}
        className="flex items-center gap-2 hover:text-foreground transition-colors"
      >
        {children}
        {getSortIcon(field)}
      </button>
    </TableHead>
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHeader field="title">Title</SortableHeader>
          <SortableHeader field="company">Company</SortableHeader>
          <SortableHeader field="status">Status</SortableHeader>
          <SortableHeader field="date">Added</SortableHeader>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => {
          const isArchived = job.archived === true;
          
          return (
            <TableRow key={job.id}>
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <span>{job.title}</span>
                  {job.job_details.location && job.job_details.location.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {job.job_details.location.join(', ')}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span>{job.company}</span>
                  {job.job_details.salary && (
                    <span className="text-sm text-muted-foreground">
                      {job.job_details.salary}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <Badge variant={getStatusBadgeVariant(job.status_info.status)}>
                    {job.status_info.status}
                  </Badge>
                  {isArchived && (
                    <Badge variant="outline" className="text-xs">
                      Archived
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(job.created_at)}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
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
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}