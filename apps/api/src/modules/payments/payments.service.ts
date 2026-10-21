export type PaymentMode = 'CHEQUE' | 'UPI' | 'NEFT_RTGS' | 'CASH';
export type PaymentStatus = 'PENDING_CLEARANCE' | 'CONFIRMED' | 'REVISION_REQUESTED';

export interface PaymentItem {
  id: string;
  projectId: string;
  amount: number;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  bankName?: string;
  receiptKey?: string;
  status: PaymentStatus;
  recordedBy: string;
  discrepancyNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

export function canRoleViewPayments(
  role: 'ADMIN' | 'STAFF' | 'CLIENT_LEADER' | 'CLIENT_VIEWER',
  projectPricingVisible: boolean
): boolean {
  // Staff NEVER sees payments under any circumstances
  if (role === 'STAFF') {
    return false;
  }
  // Admin has full universal visibility
  if (role === 'ADMIN') {
    return true;
  }
  // Client Leader / Viewer can see payments ONLY IF project toggle is enabled
  return projectPricingVisible;
}

export function createPaymentEntry(params: {
  projectId: string;
  amount: number;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  bankName?: string;
  receiptKey?: string;
  recordedBy: string;
}): PaymentItem {
  const now = new Date();
  return {
    id: `pay-${Date.now()}`,
    projectId: params.projectId,
    amount: params.amount,
    paymentMode: params.paymentMode,
    referenceNumber: params.referenceNumber,
    bankName: params.bankName,
    receiptKey: params.receiptKey,
    status: 'PENDING_CLEARANCE',
    recordedBy: params.recordedBy,
    createdAt: now,
    updatedAt: now,
  };
}

export function submitDiscrepancyRequest(
  payment: PaymentItem,
  discrepancyNote: string
): PaymentItem {
  return {
    ...payment,
    status: 'REVISION_REQUESTED',
    discrepancyNote,
    updatedAt: new Date(),
  };
}

export function correctPaymentEntry(
  payment: PaymentItem,
  updates: Partial<Pick<PaymentItem, 'amount' | 'paymentMode' | 'referenceNumber' | 'bankName' | 'status'>>,
  editorId: string
): { updatedPayment: PaymentItem; auditDiff: { oldData: any; newData: any; editorId: string } } {
  const oldData = {
    amount: payment.amount,
    status: payment.status,
    paymentMode: payment.paymentMode,
    referenceNumber: payment.referenceNumber,
  };

  const updatedPayment: PaymentItem = {
    ...payment,
    ...updates,
    updatedAt: new Date(),
  };

  const newData = {
    amount: updatedPayment.amount,
    status: updatedPayment.status,
    paymentMode: updatedPayment.paymentMode,
    referenceNumber: updatedPayment.referenceNumber,
  };

  return {
    updatedPayment,
    auditDiff: {
      oldData,
      newData,
      editorId,
    },
  };
}
