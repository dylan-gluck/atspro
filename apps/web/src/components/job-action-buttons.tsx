'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  FileText,
  Calculator,
  Building2,
  GraduationCap,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { getServicesSync } from '@/lib/services';

interface JobActionButtonsProps {
  jobId: string;
  onDocumentsUpdate: () => void;
}

interface ActionState {
  isLoading: boolean;
  isCompleted: boolean;
}

export function JobActionButtons({ jobId, onDocumentsUpdate }: JobActionButtonsProps) {
  const [actions, setActions] = useState<Record<string, ActionState>>({
    optimize: { isLoading: false, isCompleted: false },
    score: { isLoading: false, isCompleted: false },
    research: { isLoading: false, isCompleted: false },
    interview: { isLoading: false, isCompleted: false },
  });

  const { jobsService } = getServicesSync();

  const updateActionState = (actionKey: string, state: Partial<ActionState>) => {
    setActions(prev => ({
      ...prev,
      [actionKey]: { ...prev[actionKey], ...state }
    }));
  };

  const handleOptimizeResume = async () => {
    const actionKey = 'optimize';
    try {
      updateActionState(actionKey, { isLoading: true });
      
      // Create a background task for resume optimization
      const response = await jobsService.createDocument(jobId, 'Optimizing resume...', 'resume');
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to start resume optimization');
      }

      toast.success('Resume optimization started! Check back in a few minutes.');
      updateActionState(actionKey, { isLoading: false, isCompleted: true });
      onDocumentsUpdate();
      
      // Reset completed state after 3 seconds
      setTimeout(() => {
        updateActionState(actionKey, { isCompleted: false });
      }, 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to optimize resume';
      toast.error(message);
      updateActionState(actionKey, { isLoading: false });
    }
  };

  const handleCalculateScore = async () => {
    const actionKey = 'score';
    try {
      updateActionState(actionKey, { isLoading: true });
      
      // Create a background task for score calculation
      const response = await jobsService.createDocument(jobId, 'Calculating match score...', 'resume');
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to start score calculation');
      }

      toast.success('Score calculation started! Results will appear in documents.');
      updateActionState(actionKey, { isLoading: false, isCompleted: true });
      onDocumentsUpdate();
      
      // Reset completed state after 3 seconds
      setTimeout(() => {
        updateActionState(actionKey, { isCompleted: false });
      }, 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to calculate score';
      toast.error(message);
      updateActionState(actionKey, { isLoading: false });
    }
  };

  const handleCompanyResearch = async () => {
    const actionKey = 'research';
    try {
      updateActionState(actionKey, { isLoading: true });
      
      // Create a background task for company research
      const response = await jobsService.createDocument(jobId, 'Researching company...', 'portfolio');
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to start company research');
      }

      toast.success('Company research started! Report will be ready shortly.');
      updateActionState(actionKey, { isLoading: false, isCompleted: true });
      onDocumentsUpdate();
      
      // Reset completed state after 3 seconds
      setTimeout(() => {
        updateActionState(actionKey, { isCompleted: false });
      }, 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start company research';
      toast.error(message);
      updateActionState(actionKey, { isLoading: false });
    }
  };

  const handleInterviewPrep = async () => {
    const actionKey = 'interview';
    try {
      updateActionState(actionKey, { isLoading: true });
      
      // Create a background task for interview preparation
      const response = await jobsService.createDocument(jobId, 'Preparing interview questions...', 'cover_letter');
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to start interview preparation');
      }

      toast.success('Interview prep started! Questions and tips coming soon.');
      updateActionState(actionKey, { isLoading: false, isCompleted: true });
      onDocumentsUpdate();
      
      // Reset completed state after 3 seconds
      setTimeout(() => {
        updateActionState(actionKey, { isCompleted: false });
      }, 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start interview preparation';
      toast.error(message);
      updateActionState(actionKey, { isLoading: false });
    }
  };

  const actionButtons = [
    {
      key: 'optimize',
      title: 'Optimize Resume',
      description: 'Tailor your resume for this position',
      icon: FileText,
      handler: handleOptimizeResume,
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      key: 'score',
      title: 'Calculate Score',
      description: 'Get your compatibility score',
      icon: Calculator,
      handler: handleCalculateScore,
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      key: 'research',
      title: 'Company Research',
      description: 'Learn about the company culture',
      icon: Building2,
      handler: handleCompanyResearch,
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      key: 'interview',
      title: 'Interview Prep',
      description: 'Practice questions and tips',
      icon: GraduationCap,
      handler: handleInterviewPrep,
      color: 'bg-orange-500 hover:bg-orange-600'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
        <CardDescription>
          Generate optimized documents and insights for this job
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {actionButtons.map((action) => {
            const state = actions[action.key];
            const Icon = action.icon;
            
            return (
              <Button
                key={action.key}
                onClick={action.handler}
                disabled={state.isLoading}
                className={`h-auto p-4 flex flex-col items-center gap-3 text-white ${action.color}`}
                variant="default"
              >
                <div className="flex items-center justify-center w-8 h-8 bg-white/20 rounded-full">
                  {state.isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : state.isCompleted ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <div className="text-center">
                  <div className="font-medium text-sm">{action.title}</div>
                  <div className="text-xs opacity-90 mt-1">{action.description}</div>
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}