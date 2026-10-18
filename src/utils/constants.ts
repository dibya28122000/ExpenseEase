import { FinancialSettings, PaymentMethod } from '../types/finance';

export const DEFAULT_SETTINGS: FinancialSettings = {
  currency: 'INR',
  currencySymbol: '₹',
  expectedMonthlyAllowance: 12000,
  protectedFundInitialBalance: 120000,
  protectedFundOwner: 'Brother-in-law (Protected Escrow)',
  isAllowanceConfigured: false,
  isProtectedFundConfigured: false,
};

export const CATEGORIES_LIST = [
  'Groceries & Food',
  'Food & Dining',
  'Transportation',
  'Utilities & Bills',
  'Health & Medical',
  'Education & Study',
  'Personal Care & Shopping',
  'Entertainment & Leisure',
  'Transfers & Cash',
  "Father's Allowance",
  'Freelance & Income',
  'Other Expenses',
];

export const PAYMENT_ACCOUNTS = [
  'Axis Bank (••1024)',
  'Google Pay UPI (Axis)',
  'SBI Savings (••4092)',
  'HDFC Savings (••8124)',
  'Cash in Hand',
  'Paytm Wallet',
];
