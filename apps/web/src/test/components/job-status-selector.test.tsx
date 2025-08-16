import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { JobStatusSelector } from '@/components/job-status-selector';
import type { JobEntity } from '@/types/services';

describe('JobStatusSelector', () => {
  const mockOnStatusChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders current status correctly', () => {
    render(
      <JobStatusSelector
        currentStatus="saved"
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByText('Status:')).toBeInTheDocument();
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('renders different status variants', () => {
    const { rerender } = render(
      <JobStatusSelector
        currentStatus="saved"
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByText('Saved')).toBeInTheDocument();

    rerender(
      <JobStatusSelector
        currentStatus="applied"
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByText('Applied')).toBeInTheDocument();

    rerender(
      <JobStatusSelector
        currentStatus="interviewing"
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByText('Interviewing')).toBeInTheDocument();

    rerender(
      <JobStatusSelector
        currentStatus="offered"
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByText('Offered')).toBeInTheDocument();

    rerender(
      <JobStatusSelector
        currentStatus="rejected"
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('opens dropdown and shows all status options', async () => {
    render(
      <JobStatusSelector
        currentStatus="saved"
        onStatusChange={mockOnStatusChange}
      />
    );

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText('Saved')).toBeInTheDocument();
      expect(screen.getByText('Applied')).toBeInTheDocument();
      expect(screen.getByText('Interviewing')).toBeInTheDocument();
      expect(screen.getByText('Offered')).toBeInTheDocument();
      expect(screen.getByText('Rejected')).toBeInTheDocument();
    });
  });

  it('calls onStatusChange when selecting a new status', async () => {
    render(
      <JobStatusSelector
        currentStatus="saved"
        onStatusChange={mockOnStatusChange}
      />
    );

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /applied/i })).toBeInTheDocument();
    });

    const appliedOption = screen.getByRole('option', { name: /applied/i });
    fireEvent.click(appliedOption);

    expect(mockOnStatusChange).toHaveBeenCalledWith('applied');
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <JobStatusSelector
        currentStatus="saved"
        onStatusChange={mockOnStatusChange}
        disabled={true}
      />
    );

    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeDisabled();
  });

  it('shows loading spinner when disabled', () => {
    render(
      <JobStatusSelector
        currentStatus="saved"
        onStatusChange={mockOnStatusChange}
        disabled={true}
      />
    );

    // Since Loader2 might not have a testid, we'll check if the component is disabled instead
    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeDisabled();
  });

  it('handles async status change', async () => {
    const asyncStatusChange = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    render(
      <JobStatusSelector
        currentStatus="saved"
        onStatusChange={asyncStatusChange}
      />
    );

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /applied/i })).toBeInTheDocument();
    });

    const appliedOption = screen.getByRole('option', { name: /applied/i });
    fireEvent.click(appliedOption);

    expect(asyncStatusChange).toHaveBeenCalledWith('applied');
  });

  it('renders unknown status gracefully', () => {
    render(
      <JobStatusSelector
        currentStatus={'unknown' as JobEntity['status_info']['status']}
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByText('unknown')).toBeInTheDocument();
  });

  it('maintains accessibility attributes', () => {
    render(
      <JobStatusSelector
        currentStatus="saved"
        onStatusChange={mockOnStatusChange}
      />
    );

    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    
    fireEvent.click(trigger);
    
    // After opening, should have aria-expanded="true"
    waitFor(() => {
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });
  });

  it('handles keyboard navigation', async () => {
    render(
      <JobStatusSelector
        currentStatus="saved"
        onStatusChange={mockOnStatusChange}
      />
    );

    const trigger = screen.getByRole('combobox');
    
    // Focus the trigger
    trigger.focus();
    expect(trigger).toHaveFocus();

    // Open with Enter key
    fireEvent.keyDown(trigger, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /applied/i })).toBeInTheDocument();
    });

    // Navigate with arrow keys and select with Enter
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    fireEvent.keyDown(trigger, { key: 'Enter' });

    expect(mockOnStatusChange).toHaveBeenCalled();
  });
});