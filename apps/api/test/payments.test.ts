import { describe, it, expect } from 'vitest';
import {
  canRoleViewPayments,
  createPaymentEntry,
  submitDiscrepancyRequest,
  correctPaymentEntry,
} from '../src/modules/payments/payments.service';

describe('Payments Ledger & Strict Staff Isolation', () => {
  it('STRICT STAFF ISOLATION: Staff role is unconditionally forbidden from viewing payments', () => {
    // Even if project pricing toggle was somehow set to true, Staff is strictly blocked
    expect(canRoleViewPayments('STAFF', true)).toBe(false);
    expect(canRoleViewPayments('STAFF', false)).toBe(false);
  });

  it('allows Admin universal full access to payments', () => {
    expect(canRoleViewPayments('ADMIN', false)).toBe(true);
    expect(canRoleViewPayments('ADMIN', true)).toBe(true);
  });

  it('respects per-project client pricing visibility toggle', () => {
    expect(canRoleViewPayments('CLIENT_LEADER', true)).toBe(true);
    expect(canRoleViewPayments('CLIENT_LEADER', false)).toBe(false);

    expect(canRoleViewPayments('CLIENT_VIEWER', true)).toBe(true);
    expect(canRoleViewPayments('CLIENT_VIEWER', false)).toBe(false);
  });

  it('allows Admin to record and verify payments with valid modes (Cheque, UPI, NEFT/RTGS, Cash)', () => {
    const payment = createPaymentEntry({
      projectId: 'proj-1',
      amount: 500000.00,
      paymentMode: 'NEFT_RTGS',
      referenceNumber: 'NEFT99887766',
      bankName: 'HDFC Bank',
      recordedBy: 'admin-1',
    });

    expect(payment.amount).toBe(500000.00);
    expect(payment.paymentMode).toBe('NEFT_RTGS');
    expect(payment.status).toBe('PENDING_CLEARANCE');
  });

  it('allows clients to submit discrepancy notes without altering the ledger record directly', () => {
    const payment = createPaymentEntry({
      projectId: 'proj-1',
      amount: 250000.00,
      paymentMode: 'UPI',
      recordedBy: 'admin-1',
    });

    const flagged = submitDiscrepancyRequest(
      payment,
      'Payment was Rs 3,00,000 as per transaction receipt UTR 12345'
    );

    expect(flagged.status).toBe('REVISION_REQUESTED');
    expect(flagged.discrepancyNote).toContain('Payment was Rs 3,00,000');
    // Amount has NOT changed yet
    expect(flagged.amount).toBe(250000.00);
  });

  it('allows Admin to correct the payment entry and returns audit diff with old/new values', () => {
    const payment = createPaymentEntry({
      projectId: 'proj-1',
      amount: 250000.00,
      paymentMode: 'UPI',
      recordedBy: 'admin-1',
    });

    const correction = correctPaymentEntry(
      payment,
      { amount: 300000.00, status: 'CONFIRMED' },
      'admin-1'
    );

    expect(correction.updatedPayment.amount).toBe(300000.00);
    expect(correction.updatedPayment.status).toBe('CONFIRMED');
    expect(correction.auditDiff.oldData.amount).toBe(250000.00);
    expect(correction.auditDiff.newData.amount).toBe(300000.00);
  });
});
