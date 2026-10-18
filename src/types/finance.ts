export type TransactionType = 'expense' | 'income';

export type FundSource = 
  | 'father_allowance'
  | 'protected_family_fund'
  | 'other_income'
  | 'personal_savings'
  | 'unallocated';

export type PaymentMethod =
  | 'upi'
  | 'net_banking'
  | 'debit_card'
  | 'credit_card'
  | 'cash';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  description: string;
  amount: number; // in INR
  type: TransactionType;
  category: string;
  paymentMethod: PaymentMethod;
  paymentAccount: string; // e.g. "SBI Savings (••4092)", "HDFC Account (••8124)", "Cash in Hand"
  source: FundSource; // Distinction between source of money and payment account
  notes?: string;
  isDemo?: boolean;
  createdAt: string;
}

export interface AllowanceEntry {
  id: string;
  date: string;
  month: string; // YYYY-MM
  amount: number;
  expectedAmount: number;
  sourceLabel: string;
  isAdditional: boolean;
  notes?: string;
}

export interface ProtectedFundAllocation {
  id: string;
  date: string;
  amount: number;
  purpose: string;
  authorizedBy: string;
  confirmationCode: string;
  notes: string;
}

export interface FinancialSettings {
  currency: string;
  currencySymbol: string;
  expectedMonthlyAllowance: number; // ₹12,000 baseline
  protectedFundInitialBalance: number; // ₹1,20,000 baseline
  protectedFundOwner: string; // "Brother-in-law"
  isAllowanceConfigured?: boolean;
  isProtectedFundConfigured?: boolean;
}

export interface StatementPreviewItem {
  id: string;
  date: string;
  time: string;
  description: string;
  amount: number;
  type: TransactionType;
  suggestedCategory: string;
  suggestedSource: FundSource;
  paymentMethod: PaymentMethod;
  paymentAccount: string;
  referenceNumber?: string;
  duplicateStatus: 'new' | 'possible_duplicate' | 'verified';
  duplicateReason?: string;
  confidence?: 'high' | 'review_suggested';
  isTransfer?: boolean;
  isConfirmedAllowance?: boolean;
  allowDuplicateOverride?: boolean;
  selected: boolean;
}

export interface StatementImportBatch {
  id: string;
  userId: string;
  fileName: string;
  fileType: string;
  importStatus: 'pending' | 'processing' | 'completed' | 'failed';
  importedRowCount: number;
  duplicateRowCount: number;
  createdAt: string;
}

export type ActiveNavTab =
  | 'dashboard'
  | 'transactions'
  | 'daily-reports'
  | 'monthly-reports'
  | 'allowance-tracker'
  | 'protected-fund'
  | 'statement-import'
  | 'settings';
