'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useServices } from '@/lib/services';

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const services = useServices();
  const [isChecking, setIsChecking] = useState(true);
  const [hasResumeId, setHasResumeId] = useState<boolean | null>(null);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!services) {
        return;
      }

      try {
        // Skip check if already on onboarding page or auth pages
        if (pathname === '/onboarding' || pathname === '/sign-in' || pathname === '/sign-up') {
          setIsChecking(false);
          return;
        }

        // Check if user is authenticated first
        const currentUser = await services.authService.getCurrentUser();
        if (!currentUser.success || !currentUser.data) {
          // User not authenticated, let middleware handle redirect
          setIsChecking(false);
          return;
        }

        // Check if user has resume_id
        const hasResume = await services.userService.hasResumeId();
        setHasResumeId(hasResume);

        if (!hasResume) {
          // Redirect to onboarding if no resume_id
          router.push('/onboarding');
        } else {
          setIsChecking(false);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setIsChecking(false);
      }
    };

    checkOnboardingStatus();
  }, [services, pathname, router]);

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Checking account status...</p>
        </div>
      </div>
    );
  }

  // If we're on the onboarding page or user has resume_id, show children
  if (pathname === '/onboarding' || hasResumeId) {
    return <>{children}</>;
  }

  // Don't render anything while redirecting
  return null;
}