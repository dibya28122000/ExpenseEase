import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { 
  Transaction, 
  AllowanceEntry, 
  ProtectedFundAllocation, 
  FinancialSettings, 
  ActiveNavTab,
  StatementPreviewItem 
} from '../types/finance';
import { 
  INITIAL_SETTINGS, 
  INITIAL_ALLOWANCE_ENTRIES, 
  INITIAL_PROTECTED_ALLOCATIONS, 
  INITIAL_TRANSACTIONS 
} from '../utils/demoData';
import { 
  getDashboardMetrics, 
  DashboardMetrics, 
  getDailyMetrics, 
  DailyMetrics, 
  getMonthlyMetrics, 
  MonthlyMetrics 
} from '../utils/calculations';
import { getCurrentDateString, getMonthKey } from '../utils/formatters';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { 
  ensureUserFinancesInitialized,
  fetchUserFunds,
  fetchUserSettings,
  updateUserSettings,
  fetchCloudTransactions,
  insertCloudTransaction,
  updateCloudTransaction,
  deleteCloudTransaction,
  fetchCloudAllowanceEntries,
  recordCloudAllowanceEntry,
  fetchCloudProtectedAllocations,
  recordCloudProtectedAllocation,
  executeStatementImportBatch,
  StatementImportResult,
  SupabaseFund,
} from '../services/supabaseService';

interface FinanceContextType {
  // Auth & Cloud Status
  currentUser: User | null;
  isCloudConnected: boolean;
  isConfigured: boolean;
  authLoading: boolean;
  cloudSyncing: boolean;
  cloudError: string | null;
  userFunds: SupabaseFund[];
  signOut: () => Promise<void>;
  refreshCloudData: () => Promise<void>;

  // Navigation & Date State
  activeTab: ActiveNavTab;
  setActiveTab: (tab: ActiveNavTab) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;

  // Master Financial State
  transactions: Transaction[];
  allowanceEntries: AllowanceEntry[];
  protectedAllocations: ProtectedFundAllocation[];
  settings: FinancialSettings;

  // Transaction Actions
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => Promise<Transaction>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  importStatementBatch: (
    fileName: string,
    fileType: string,
    items: StatementPreviewItem[]
  ) => Promise<StatementImportResult>;

  // Fund Actions
  addAllowanceEntry: (entry: Omit<AllowanceEntry, 'id'>) => Promise<AllowanceEntry>;
  addProtectedAllocation: (allocation: Omit<ProtectedFundAllocation, 'id'>) => Promise<ProtectedFundAllocation>;
  
  // Settings & Reset
  updateSettings: (newSettings: Partial<FinancialSettings>) => Promise<void>;
  resetToDemoData: () => void;
  exportData: (format: 'json' | 'csv') => void;

  // Computed Summaries
  dashboardMetrics: DashboardMetrics;
  getDailyData: (date: string) => DailyMetrics;
  getMonthlyData: (monthKey: string) => MonthlyMetrics;
}

const STORAGE_KEYS = {
  TRANSACTIONS: 'expense_ease_transactions_v1',
  ALLOWANCES: 'expense_ease_allowances_v1',
  PROTECTED: 'expense_ease_protected_v1',
  SETTINGS: 'expense_ease_settings_v1',
};

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isConfigured = isSupabaseConfigured();

  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [cloudSyncing, setCloudSyncing] = useState<boolean>(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [userFunds, setUserFunds] = useState<SupabaseFund[]>([]);

  // Navigation state
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>(() => getCurrentDateString());
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getMonthKey(getCurrentDateString()));

  // Real Transactions state (Clean production ledger)
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Exclude any obsolete demo records
          const realTransactions = parsed.filter((t: any) => !t.isDemo);
          if (realTransactions.length > 0) return realTransactions;
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Real Allowance Entries
  const [allowanceEntries, setAllowanceEntries] = useState<AllowanceEntry[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ALLOWANCES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Real Protected Allocations
  const [protectedAllocations, setProtectedAllocations] = useState<ProtectedFundAllocation[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PROTECTED);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Financial Settings
  const [settings, setSettings] = useState<FinancialSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return INITIAL_SETTINGS;
  });

  const isCloudConnected = Boolean(isConfigured && currentUser);

  // Sync to localStorage only when in local demo mode
  useEffect(() => {
    if (!isCloudConnected) {
      try {
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
      } catch {
        // ignore
      }
    }
  }, [transactions, isCloudConnected]);

  useEffect(() => {
    if (!isCloudConnected) {
      try {
        localStorage.setItem(STORAGE_KEYS.ALLOWANCES, JSON.stringify(allowanceEntries));
      } catch {
        // ignore
      }
    }
  }, [allowanceEntries, isCloudConnected]);

  useEffect(() => {
    if (!isCloudConnected) {
      try {
        localStorage.setItem(STORAGE_KEYS.PROTECTED, JSON.stringify(protectedAllocations));
      } catch {
        // ignore
      }
    }
  }, [protectedAllocations, isCloudConnected]);

  useEffect(() => {
    if (!isCloudConnected) {
      try {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      } catch {
        // ignore
      }
    }
  }, [settings, isCloudConnected]);

  // Load cloud data for authenticated user
  const refreshCloudData = useCallback(async () => {
    if (!supabase || !currentUser) return;
    try {
      setCloudSyncing(true);
      setCloudError(null);

      // 1. Ensure profile & funds exist in Supabase
      await ensureUserFinancesInitialized(currentUser.id, currentUser.user_metadata?.display_name);

      // 2. Fetch funds & settings
      const funds = await fetchUserFunds(currentUser.id);
      setUserFunds(funds);

      const cloudSettings = await fetchUserSettings(currentUser.id);
      if (cloudSettings) {
        setSettings(cloudSettings);
      }

      // 3. Fetch cloud transactions
      const cloudTx = await fetchCloudTransactions(currentUser.id, funds);
      setTransactions(cloudTx);

      // 4. Fetch cloud allowance entries
      const cloudAllow = await fetchCloudAllowanceEntries(currentUser.id);
      setAllowanceEntries(cloudAllow);

      // 5. Fetch cloud protected allocations
      const cloudProtected = await fetchCloudProtectedAllocations(currentUser.id);
      setProtectedAllocations(cloudProtected);
    } catch (err: any) {
      setCloudError(err?.message || 'Error syncing data with Supabase.');
    } finally {
      setCloudSyncing(false);
    }
  }, [currentUser]);

  // Setup Supabase Auth listener
  useEffect(() => {
    if (!supabase || !isConfigured) {
      setAuthLoading(false);
      return;
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isConfigured]);

  // Trigger cloud sync when user changes
  useEffect(() => {
    if (currentUser) {
      refreshCloudData();
    } else {
      // Clean zero state when unauthenticated
      setUserFunds([]);
      setTransactions([]);
      setAllowanceEntries([]);
      setProtectedAllocations([]);
      setSettings(INITIAL_SETTINGS);
    }
  }, [currentUser, refreshCloudData]);

  // Sign out
  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
  };

  // Transaction Handlers (Cloud-aware)
  const addTransaction = async (data: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> => {
    if (isCloudConnected && currentUser) {
      const createdTx = await insertCloudTransaction(currentUser.id, data, userFunds);
      setTransactions((prev) => [createdTx, ...prev]);
      return createdTx;
    }

    // Local ledger
    const newTx: Transaction = {
      ...data,
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      isDemo: false,
    };
    setTransactions((prev) => [newTx, ...prev]);
    return newTx;
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    if (isCloudConnected && currentUser) {
      await updateCloudTransaction(currentUser.id, id, updates, userFunds);
    }

    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  const deleteTransaction = async (id: string) => {
    if (isCloudConnected && currentUser) {
      await deleteCloudTransaction(currentUser.id, id);
    }

    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const importStatementBatch = async (
    fileName: string,
    fileType: string,
    items: StatementPreviewItem[]
  ): Promise<StatementImportResult> => {
    if (isCloudConnected && currentUser) {
      const res = await executeStatementImportBatch(currentUser.id, fileName, fileType, items, userFunds);
      if (res.importedTransactions.length > 0) {
        setTransactions((prev) => [...res.importedTransactions, ...prev]);
        const hasAllowance = items.some((i) => i.type === 'income' && i.suggestedCategory === "Father's Allowance");
        if (hasAllowance) {
          const cloudAllow = await fetchCloudAllowanceEntries(currentUser.id);
          setAllowanceEntries(cloudAllow);
        }
      }
      return res;
    }

    // Local fallback for demo/offline session
    const importedTransactions: Transaction[] = [];
    const newAllowances: AllowanceEntry[] = [];
    let skippedDuplicateCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Invariant 1: Protected Fund Guard
      if (item.suggestedSource === 'protected_family_fund') {
        continue;
      }

      // Invariant 2: Duplicate Safety Guard against existing transactions
      const isExistingDup = transactions.some((existing) => {
        if (item.referenceNumber && existing.notes?.includes(item.referenceNumber)) return true;
        return (
          existing.date === item.date &&
          existing.amount === item.amount &&
          existing.description.toLowerCase() === item.description.toLowerCase()
        );
      });

      if (isExistingDup && !item.allowDuplicateOverride) {
        skippedDuplicateCount++;
        continue;
      }

      const notes = [
        item.referenceNumber ? `Ref/UTR: ${item.referenceNumber}` : null,
        item.isTransfer ? '[INTERNAL TRANSFER]' : null,
        isExistingDup && item.allowDuplicateOverride ? '[MANUAL DUPLICATE OVERRIDE]' : null,
        `Imported from statement: ${fileName}`,
      ].filter(Boolean).join(' · ');

      const newTx: Transaction = {
        id: `tx-import-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        date: item.date,
        time: item.time,
        description: item.description,
        amount: item.amount,
        type: item.type,
        category: item.suggestedCategory,
        paymentMethod: item.paymentMethod,
        paymentAccount: item.paymentAccount,
        source: item.suggestedSource || 'unallocated',
        notes,
        isDemo: false,
        createdAt: new Date().toISOString(),
      };
      importedTransactions.push(newTx);

      // Invariant 3: Allowance Accuracy
      // ONLY confirmed allowance credits explicitly confirmed by the user increase allowance entries
      if (
        item.type === 'income' && 
        item.suggestedCategory === "Father's Allowance" && 
        item.isConfirmedAllowance === true
      ) {
        newAllowances.push({
          id: `allow-import-${Date.now()}-${i}`,
          date: item.date,
          month: item.date.substring(0, 7),
          amount: item.amount,
          expectedAmount: 12000,
          sourceLabel: "Father's Account (Confirmed Statement Transfer)",
          isAdditional: false,
          notes: `Imported from ${fileName}`,
        });
      }
    }

    setTransactions((prev) => [...importedTransactions, ...prev]);
    if (newAllowances.length > 0) {
      setAllowanceEntries((prev) => [...newAllowances, ...prev]);
    }

    return {
      batchId: `local-batch-${Date.now()}`,
      importedTransactions,
      importedCount: importedTransactions.length,
      duplicateCount: skippedDuplicateCount,
      failedCount: 0,
      errors: [],
    };
  };

  // Allowance Handler (Cloud-aware)
  const addAllowanceEntry = async (data: Omit<AllowanceEntry, 'id'>): Promise<AllowanceEntry> => {
    if (isCloudConnected && currentUser) {
      const cloudEntry = await recordCloudAllowanceEntry(currentUser.id, data, userFunds);
      setAllowanceEntries((prev) => [cloudEntry, ...prev]);
      // Also refresh transactions to include linked transaction
      const updatedTx = await fetchCloudTransactions(currentUser.id, userFunds);
      setTransactions(updatedTx);
      return cloudEntry;
    }

    // Local fallback
    const newEntry: AllowanceEntry = {
      ...data,
      id: `allow-${Date.now()}`,
    };
    setAllowanceEntries((prev) => [newEntry, ...prev]);

    // Also record a corresponding transaction for transparency
    await addTransaction({
      date: data.date,
      time: '10:00',
      description: data.isAdditional 
        ? "Father's Additional Allowance" 
        : "Father's Monthly Allowance",
      amount: data.amount,
      type: 'income',
      category: "Father's Allowance",
      paymentMethod: 'net_banking',
      paymentAccount: 'SBI Savings (••4092)',
      source: 'father_allowance',
      notes: data.notes || (data.isAdditional ? 'Additional allowance received' : 'Monthly allowance credit'),
    });

    return newEntry;
  };

  // Protected Allocation Handler (Cloud-aware)
  const addProtectedAllocation = async (data: Omit<ProtectedFundAllocation, 'id'>): Promise<ProtectedFundAllocation> => {
    if (isCloudConnected && currentUser) {
      const cloudAlloc = await recordCloudProtectedAllocation(currentUser.id, data, userFunds);
      setProtectedAllocations((prev) => [cloudAlloc, ...prev]);
      // Also refresh transactions to include linked transaction
      const updatedTx = await fetchCloudTransactions(currentUser.id, userFunds);
      setTransactions(updatedTx);
      return cloudAlloc;
    }

    // Local fallback
    const newAlloc: ProtectedFundAllocation = {
      ...data,
      id: `prot-alloc-${Date.now()}`,
    };
    setProtectedAllocations((prev) => [newAlloc, ...prev]);

    // Record an expense transaction allocated explicitly to the protected fund
    await addTransaction({
      date: data.date,
      time: '12:00',
      description: `[PROTECTED FUND ALLOCATION] ${data.purpose}`,
      amount: data.amount,
      type: 'expense',
      category: 'Protected Fund Transfer',
      paymentMethod: 'net_banking',
      paymentAccount: 'SBI Savings (••4092)',
      source: 'protected_family_fund',
      notes: `Explicit allocation authorized by ${data.authorizedBy}. Confirmation code: ${data.confirmationCode}. ${data.notes}`,
    });

    return newAlloc;
  };

  const updateSettingsHandler = async (newSettings: Partial<FinancialSettings>) => {
    if (isCloudConnected && currentUser) {
      await updateUserSettings(currentUser.id, newSettings);
    }
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const resetToDemoData = () => {
    setTransactions([]);
    setAllowanceEntries([]);
    setProtectedAllocations([]);
    setSettings(INITIAL_SETTINGS);
    setSelectedDate(getCurrentDateString());
    setSelectedMonth(getMonthKey(getCurrentDateString()));
    try {
      localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
      localStorage.removeItem(STORAGE_KEYS.ALLOWANCES);
      localStorage.removeItem(STORAGE_KEYS.PROTECTED);
    } catch {
      // ignore
    }
  };

  const exportData = (format: 'json' | 'csv') => {
    if (format === 'json') {
      const exportObject = {
        meta: {
          app: 'ExpenseEase',
          exportDate: new Date().toISOString(),
          phase: isCloudConnected ? 'Supabase Cloud Ledger' : 'Local Storage',
          userId: currentUser?.id || 'unauthenticated-user',
        },
        settings,
        allowanceEntries,
        protectedAllocations,
        transactions,
      };
      const blob = new Blob([JSON.stringify(exportObject, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ExpenseEase-Backup-${getCurrentDateString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ['ID', 'Date', 'Time', 'Type', 'Description', 'Amount(INR)', 'Category', 'Payment Method', 'Payment Account', 'Source', 'Notes'];
      const rows = transactions.map((t) => [
        `"${t.id}"`,
        `"${t.date}"`,
        `"${t.time}"`,
        `"${t.type}"`,
        `"${(t.description || '').replace(/"/g, '""')}"`,
        t.amount,
        `"${(t.category || '').replace(/"/g, '""')}"`,
        `"${(t.paymentMethod || '').replace(/"/g, '""')}"`,
        `"${(t.paymentAccount || '').replace(/"/g, '""')}"`,
        `"${(t.source || '').replace(/"/g, '""')}"`,
        `"${(t.notes || '').replace(/"/g, '""')}"`,
      ]);
      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ExpenseEase-Transactions-${getCurrentDateString()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Memoized calculations (runs over current cloud or local transactions)
  const dashboardMetrics = useMemo(() => {
    return getDashboardMetrics(transactions, allowanceEntries, protectedAllocations, settings);
  }, [transactions, allowanceEntries, protectedAllocations, settings]);

  const getDailyData = (date: string) => {
    return getDailyMetrics(transactions, date);
  };

  const getMonthlyData = (monthKey: string) => {
    return getMonthlyMetrics(transactions, monthKey, allowanceEntries);
  };

  const value = {
    currentUser,
    isCloudConnected,
    isConfigured,
    authLoading,
    cloudSyncing,
    cloudError,
    userFunds,
    signOut,
    refreshCloudData,
    transactions,
    allowanceEntries,
    protectedAllocations,
    settings,
    activeTab,
    setActiveTab,
    selectedDate,
    setSelectedDate,
    selectedMonth,
    setSelectedMonth,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    importStatementBatch,
    addAllowanceEntry,
    addProtectedAllocation,
    updateSettings: updateSettingsHandler,
    resetToDemoData,
    exportData,
    dashboardMetrics,
    getDailyData,
    getMonthlyData,
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
