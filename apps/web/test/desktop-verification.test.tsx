import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DesktopVerificationView } from '../src/components/desktop/DesktopVerificationView';

describe('Task 7: Desktop Master-Detail Drawing Verification', () => {
  it('strictly blocks CLIENT roles as verification is an internal studio workflow', () => {
    render(<DesktopVerificationView userRole="CLIENT_LEADER" />);

    expect(screen.getByTestId('verification-client-restricted')).toBeInTheDocument();
    expect(screen.getByText('Internal Studio Verification Workflow')).toBeInTheDocument();
    expect(screen.queryByTestId('master-detail-split')).not.toBeInTheDocument();
  });

  it('renders 3-pane master-detail split layout for ADMIN', () => {
    render(<DesktopVerificationView userRole="ADMIN" />);

    expect(screen.getByTestId('desktop-verification-view')).toBeInTheDocument();
    expect(screen.getByTestId('master-detail-split')).toBeInTheDocument();
    expect(screen.getByTestId('verification-queue-column')).toBeInTheDocument();
    expect(screen.getByTestId('verification-canvas-column')).toBeInTheDocument();
    expect(screen.getByTestId('verification-inspector-column')).toBeInTheDocument();
  });

  it('updates selected drawing when clicking an item in the verification queue', () => {
    render(<DesktopVerificationView userRole="ADMIN" />);

    const item2 = screen.getByTestId('queue-item-ver-102');
    fireEvent.click(item2);

    expect(
      screen.getAllByText('Courtyard Reflecting Pool Hydraulic Drainage Sump Section').length
    ).toBeGreaterThan(0);
  });

  it('ADMIN can approve drawing and apply official studio architectural seal', () => {
    const onApprove = vi.fn();
    render(<DesktopVerificationView userRole="ADMIN" onApprove={onApprove} />);

    // Initially ver-101 is pending
    expect(screen.queryByTestId('official-studio-seal')).not.toBeInTheDocument();

    // Click Approve & Apply Studio Seal button
    const approveBtn = screen.getByTestId('approve-seal-btn');
    fireEvent.click(approveBtn);

    expect(onApprove).toHaveBeenCalledWith('ver-101');
    expect(screen.getByTestId('official-studio-seal')).toBeInTheDocument();
    expect(screen.getByText('APPROVED FOR CONSTRUCTION')).toBeInTheDocument();
  });

  it('ADMIN can request revision via centered modal dialog', () => {
    const onRequestRevision = vi.fn();
    render(<DesktopVerificationView userRole="ADMIN" onRequestRevision={onRequestRevision} />);

    // Click Request Revision button
    const revisionBtn = screen.getByTestId('request-revision-btn');
    fireEvent.click(revisionBtn);

    expect(screen.getByTestId('revision-modal')).toBeInTheDocument();

    // Fill notes
    const textarea = screen.getByTestId('textarea-revision-feedback');
    fireEvent.change(textarea, {
      target: { value: 'Adjust column centerlines along grid axis C-4' },
    });

    const submitBtn = screen.getByTestId('submit-revision-btn');
    fireEvent.click(submitBtn);

    expect(onRequestRevision).toHaveBeenCalledWith(
      'ver-101',
      'Adjust column centerlines along grid axis C-4'
    );
    expect(screen.queryByTestId('revision-modal')).not.toBeInTheDocument();
  });

  it('STAFF can submit a new drawing for technical verification', () => {
    const onSubmitDrawing = vi.fn();
    render(<DesktopVerificationView userRole="STAFF" onSubmitDrawing={onSubmitDrawing} />);

    // Staff sees submit button
    const submitBtn = screen.getByTestId('staff-submit-drawing-btn');
    fireEvent.click(submitBtn);

    expect(screen.getByTestId('staff-submit-drawing-modal')).toBeInTheDocument();

    // Enter details
    const titleInput = screen.getByTestId('input-submit-title');
    fireEvent.change(titleInput, { target: { value: 'Reflected Ceiling Cove Detailing' } });

    const confirmBtn = screen.getByTestId('confirm-staff-submit-btn');
    fireEvent.click(confirmBtn);

    expect(onSubmitDrawing).toHaveBeenCalledWith(
      expect.objectContaining({
        drawingTitle: 'Reflected Ceiling Cove Detailing',
        status: 'PENDING_APPROVAL',
      })
    );
    expect(screen.queryByTestId('staff-submit-drawing-modal')).not.toBeInTheDocument();
  });
});
