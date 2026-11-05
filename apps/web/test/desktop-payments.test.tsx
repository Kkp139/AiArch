import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DesktopPaymentsView } from '../src/components/desktop/DesktopPaymentsView';

describe('Task 6: Desktop Financial Ledger Table', () => {
  it('blocks STAFF role strictly per Master Spec Chapters 8 & 14', () => {
    render(<DesktopPaymentsView userRole="STAFF" />);

    expect(screen.getByTestId('payments-staff-restricted')).toBeInTheDocument();
    expect(screen.getByText(/Access Denied: Financial Ledger/i)).toBeInTheDocument();
    expect(screen.queryByTestId('payment-metrics-banner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('payment-ledger-table')).not.toBeInTheDocument();
  });

  it('blocks CLIENT role when showPricing is false', () => {
    render(<DesktopPaymentsView userRole="CLIENT_LEADER" showPricing={false} />);

    expect(screen.getByTestId('payments-pricing-restricted')).toBeInTheDocument();
    expect(screen.getByText(/Pricing Transparency Restricted/i)).toBeInTheDocument();
    expect(screen.queryByTestId('payment-ledger-table')).not.toBeInTheDocument();
  });

  it('renders split metrics banner and collection ratio for ADMIN', () => {
    render(
      <DesktopPaymentsView
        userRole="ADMIN"
        totalAgreedFee={4800000}
        advanceReceived={2850000}
      />
    );

    expect(screen.getByTestId('payment-metrics-banner')).toBeInTheDocument();
    expect(screen.getByText('₹48,00,000')).toBeInTheDocument();
    expect(screen.getByText('₹28,50,000')).toBeInTheDocument();
    expect(screen.getByText('₹19,50,000')).toBeInTheDocument();
    expect(screen.getByText('59%')).toBeInTheDocument(); // 28.5L / 48L = 59%
  });

  it('renders high-density data table with all status pills', () => {
    render(<DesktopPaymentsView userRole="ADMIN" />);

    expect(screen.getByTestId('payment-ledger-table')).toBeInTheDocument();
    expect(screen.getByTestId('payment-row-pay-001')).toBeInTheDocument();
    expect(screen.getByTestId('payment-row-pay-002')).toBeInTheDocument();

    // Check status badges
    expect(screen.getAllByTestId('status-confirmed').length).toBeGreaterThan(0);
    expect(screen.getByTestId('status-pending-clearance')).toBeInTheDocument();
    expect(screen.getByTestId('status-revision-requested')).toBeInTheDocument();
  });

  it('opens receipt preview centered modal dialog and allows downloading', () => {
    const onDownloadReceipt = vi.fn();
    render(<DesktopPaymentsView userRole="ADMIN" onDownloadReceipt={onDownloadReceipt} />);

    const receiptBtn = screen.getByTestId('receipt-preview-btn-pay-001');
    fireEvent.click(receiptBtn);

    expect(screen.getByTestId('receipt-preview-modal')).toBeInTheDocument();
    expect(screen.getByText('Official Architectural Tax Receipt')).toBeInTheDocument();
    expect(screen.getAllByText('INV-AF-2026-001').length).toBeGreaterThan(0);

    // Close button
    const closeBtn = screen.getByTestId('close-receipt-modal');
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId('receipt-preview-modal')).not.toBeInTheDocument();
  });

  it('allows CLIENT_LEADER to submit financial discrepancy report', () => {
    const onSubmitDiscrepancy = vi.fn();
    render(
      <DesktopPaymentsView
        userRole="CLIENT_LEADER"
        showPricing={true}
        onSubmitDiscrepancy={onSubmitDiscrepancy}
      />
    );

    const reportBtn = screen.getByTestId('report-discrepancy-btn-pay-003');
    fireEvent.click(reportBtn);

    expect(screen.getByTestId('discrepancy-modal')).toBeInTheDocument();

    const textarea = screen.getByTestId('textarea-discrepancy-note');
    fireEvent.change(textarea, { target: { value: 'TDS amount 10% not accounted in ledger' } });

    const submitBtn = screen.getByTestId('submit-discrepancy-btn');
    fireEvent.click(submitBtn);

    expect(onSubmitDiscrepancy).toHaveBeenCalledWith(
      'pay-003',
      'TDS amount 10% not accounted in ledger'
    );
    expect(screen.queryByTestId('discrepancy-modal')).not.toBeInTheDocument();
  });
});
