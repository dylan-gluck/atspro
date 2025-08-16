'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useJobsService } from '@/lib/services';
import { toast } from 'sonner';
import { 
  Building2, 
  Grid3X3, 
  List, 
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JobEntity } from '@/types/services';
import { JobTable } from './job-table';
import { JobCard } from './job-card';
import { EmptyJobsState } from './EmptyJobsState';

export interface JobListProps {
  className?: string;
  refreshTrigger?: number; // Used to trigger refresh when new jobs are added
  onAddJob?: () => void; // Callback for when user wants to add a job
}

type ViewMode = 'table' | 'cards';
type FilterStatus = 'all' | 'active' | 'archived';
type SortField = 'date' | 'company' | 'title' | 'status';
type SortOrder = 'asc' | 'desc';

interface ViewPreferences {
  viewMode: ViewMode;
  pageSize: number;
  sortField: SortField;
  sortOrder: SortOrder;
}

const STORAGE_KEY = 'atspro-job-list-preferences';
const DEFAULT_PREFERENCES: ViewPreferences = {
  viewMode: 'table',
  pageSize: 10,
  sortField: 'date',
  sortOrder: 'desc'
};

export function JobList({ className, refreshTrigger, onAddJob }: JobListProps) {
  const [jobs, setJobs] = useState<JobEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  
  // Load preferences from localStorage
  const [preferences, setPreferences] = useState<ViewPreferences>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
        } catch {
          return DEFAULT_PREFERENCES;
        }
      }
    }
    return DEFAULT_PREFERENCES;
  });
  
  const jobsService = useJobsService();
  
  // Save preferences to localStorage
  const savePreferences = useCallback((newPrefs: Partial<ViewPreferences>) => {
    const updated = { ...preferences, ...newPrefs };
    setPreferences(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  }, [preferences]);

  const loadJobs = async () => {
    if (!jobsService) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Build search parameters
      const params: Record<string, unknown> = {
        page: currentPage,
        page_size: preferences.pageSize
      };

      // Add status filter (archived vs active)
      if (filterStatus === 'active') {
        params.archived = false;
      } else if (filterStatus === 'archived') {
        params.archived = true;
      }
      // 'all' shows both active and archived

      // Add search query
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      // Add sorting
      params.sort_by = preferences.sortField;
      params.sort_order = preferences.sortOrder;

      const response = await jobsService.listJobs(params);

      if (response.success) {
        // Ensure we have the expected data structure
        const jobData = response.data || { data: [], total: 0, has_next: false, has_previous: false };
        setJobs(jobData.data || []);
        setTotalJobs(jobData.total || 0);
        setHasNext(jobData.has_next || false);
        setHasPrevious(jobData.has_previous || false);
      } else {
        // Handle API errors gracefully - show empty state instead of error
        setJobs([]);
        setTotalJobs(0);
        setHasNext(false);
        setHasPrevious(false);
        console.warn('Failed to load jobs:', response.message);
        // Only show error toast if it's not a 404 (no jobs found)
        if (response.message && !response.message.includes('not found') && !response.message.includes('No jobs')) {
          toast.error('Unable to load jobs at this time');
        }
      }
    } catch (error) {
      // Handle network/service errors gracefully
      setJobs([]);
      setTotalJobs(0);
      setHasNext(false);
      setHasPrevious(false);
      console.warn('Error loading jobs:', error);
      // Only show error if it's a real network error
      if (error instanceof Error && error.message.includes('fetch')) {
        toast.error('Network error - please check your connection');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Archive/unarchive functionality
  const handleArchiveToggle = async (jobId: string, isArchived: boolean) => {
    if (!jobsService) return;

    try {
      const response = await jobsService.updateJob(jobId, { archived: !isArchived });
      if (response.success) {
        toast.success(isArchived ? 'Job unarchived' : 'Job archived');
        loadJobs(); // Refresh the list
      } else {
        toast.error('Failed to update job');
      }
    } catch (error) {
      toast.error('An error occurred while updating job');
      console.error('Error updating job:', error);
    }
  };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (pageSize: number) => {
    savePreferences({ pageSize });
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // View mode handlers
  const handleViewModeChange = (viewMode: ViewMode) => {
    savePreferences({ viewMode });
  };

  // Sort handlers
  const handleSort = (field: SortField) => {
    const newOrder = preferences.sortField === field && preferences.sortOrder === 'asc' ? 'desc' : 'asc';
    savePreferences({ sortField: field, sortOrder: newOrder });
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Search handler with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1); // Reset to first page when searching
      loadJobs();
    }, 300);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  useEffect(() => {
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobsService, filterStatus, currentPage, preferences.pageSize, preferences.sortField, preferences.sortOrder, refreshTrigger]);

  // Calculate pagination info
  const totalPages = Math.ceil(totalJobs / preferences.pageSize);
  const startItem = (currentPage - 1) * preferences.pageSize + 1;
  const endItem = Math.min(currentPage * preferences.pageSize, totalJobs);

  if (isLoading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle>Recent Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading jobs...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Jobs</CardTitle>
              <CardDescription>
                {totalJobs === 0 
                  ? 'No jobs found' 
                  : `${totalJobs} job${totalJobs === 1 ? '' : 's'} found`
                }
                {totalJobs > 0 && (
                  <span className="ml-2">
                    ({startItem}-{endItem} of {totalJobs})
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Tabs value={filterStatus} onValueChange={(value) => setFilterStatus(value as FilterStatus)}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="archived">Archived</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex border rounded-md">
                <Button
                  variant={preferences.viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleViewModeChange('table')}
                  className="rounded-r-none"
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={preferences.viewMode === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleViewModeChange('cards')}
                  className="rounded-l-none"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* Search and Controls */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search jobs by title or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={preferences.pageSize.toString()} onValueChange={(value) => handlePageSizeChange(parseInt(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {jobs.length === 0 ? (
            <EmptyJobsState
              isSearching={!!searchQuery.trim()}
              searchQuery={searchQuery}
              onAddJob={onAddJob}
            />
          ) : preferences.viewMode === 'table' ? (
            <JobTable
              jobs={jobs}
              sortField={preferences.sortField}
              sortOrder={preferences.sortOrder}
              onSort={handleSort}
              onArchiveToggle={handleArchiveToggle}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
                <JobCard 
                  key={job.id} 
                  job={job} 
                  onArchiveToggle={handleArchiveToggle}
                />
              ))}
            </div>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                Showing {startItem} to {endItem} of {totalJobs} jobs
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!hasPrevious}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else {
                      // Smart pagination: show pages around current page
                      const start = Math.max(1, currentPage - 2);
                      const end = Math.min(totalPages, start + 4);
                      pageNum = start + i;
                      if (pageNum > end) return null;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  }).filter(Boolean)}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!hasNext}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}