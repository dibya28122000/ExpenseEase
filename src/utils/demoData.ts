import { Transaction, AllowanceEntry, ProtectedFundAllocation, FinancialSettings } from '../types/finance';
import { DEFAULT_SETTINGS, CATEGORIES_LIST, PAYMENT_ACCOUNTS } from './constants';

export { CATEGORIES_LIST, PAYMENT_ACCOUNTS };

export const INITIAL_SETTINGS: FinancialSettings = {
  ...DEFAULT_SETTINGS,
};

// In production, user starts with a clean zero ledger until authenticated records are loaded
export const INITIAL_ALLOWANCE_ENTRIES: AllowanceEntry[] = [];

export const INITIAL_PROTECTED_ALLOCATIONS: ProtectedFundAllocation[] = [];

export const INITIAL_TRANSACTIONS: Transaction[] = [];
