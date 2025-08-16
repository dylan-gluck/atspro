'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import type { JobEntity } from '@/types/services';

const JOB_STATUSES = [
  { value: 'saved', label: 'Saved', variant: 'secondary' },
  { value: 'applied', label: 'Applied', variant: 'default' },
  { value: 'interviewing', label: 'Interviewing', variant: 'outline' },
  { value: 'offered', label: 'Offered', variant: 'default' },
  { value: 'rejected', label: 'Rejected', variant: 'destructive' },
] as const;

interface JobStatusSelectorProps {
  currentStatus: JobEntity['status_info']['status'];
  onStatusChange: (status: JobEntity['status_info']['status']) => Promise<void>;
  disabled?: boolean;
}

export function JobStatusSelector({ 
  currentStatus, 
  onStatusChange, 
  disabled = false 
}: JobStatusSelectorProps) {
  const currentStatusConfig = JOB_STATUSES.find(s => s.value === currentStatus);

  const getStatusVariant = (status: string) => {
    const config = JOB_STATUSES.find(s => s.value === status);
    return config?.variant || 'secondary';
  };

  return (
    <div className="flex items-center gap-3">
      <div className="text-sm font-medium text-muted-foreground">
        Status:
      </div>
      <Select
        value={currentStatus}
        onValueChange={onStatusChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-auto min-w-[140px] h-auto p-0 border-none bg-transparent hover:bg-accent">
          <SelectValue asChild>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusVariant(currentStatus)}>
                {currentStatusConfig?.label || currentStatus}
              </Badge>
              {disabled && <Loader2 className="w-3 h-3 animate-spin" />}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {JOB_STATUSES.map((status) => (
            <SelectItem 
              key={status.value} 
              value={status.value}
              className="flex items-center gap-2"
            >
              <Badge variant={status.variant} className="pointer-events-none">
                {status.label}
              </Badge>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}