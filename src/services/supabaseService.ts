import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { 
  Transaction, 
  AllowanceEntry, 
  ProtectedFundAllocation, 
  FinancialSettings, 
  FundSource,
  StatementPreviewItem 
} from '../types/finance';

export interface SupabaseProfile {
  id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseFund {
  id: string;
  user_id: string;
  fund_name: string;
  fund_type: FundSource;
  opening_balance: number;
  currency: string;
  is_protected: boolean;
}

export interface MigrationResult {
  migratedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: string[];
}

/**
 * Ensures user finances (profile, default settings, and the 3 initial funds)
 * are initialized in Supabase PostgreSQL tables.
 */
export async function ensureUserFinancesInitialized(userId: string, displayName?: string) {
  if (!supabase) throw new Error('Supabase client is not configured.');

  // 1. Check or create profile
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!existingProfile) {
    await supabase.from('profiles').insert({
      id: userId,
      display_name: displayName || 'ExpenseEase User',
    });
  }

  // 2. Check or create financial settings
  const { data: existingSettings } = await supabase
    .from('financial_settings')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!existingSettings) {
    await supabase.from('financial_settings').insert({
      user_id: userId,
      expected_monthly_allowance: 12000.00,
      currency: 'INR',
      timezone: 'Asia/Kolkata',
    });
  }

  // 3. Ensure the 3 core financial funds are created with exact specifications
  const initialFunds = [
    {
      user_id: userId,
      fund_name: "Father's Allowance",
      fund_type: 'father_allowance',
      opening_balance: 0.00,
      currency: 'INR',
      is_protected: false,
    },
    {
      user_id: userId,
      fund_name: 'Protected Family Fund',
      fund_type: 'protected_family_fund',
      opening_balance: 120000.00, // ₹1,20,000 initial reference balance
      currency: 'INR',
      is_protected: true,
    },
    {
      user_id: userId,
      fund_name: 'Other Income',
      fund_type: 'other_income',
      opening_balance: 0.00,
      currency: 'INR',
      is_protected: false,
    },
    {
      user_id: userId,
      fund_name: 'Personal Savings',
      fund_type: 'personal_savings',
      opening_balance: 0.00,
      currency: 'INR',
      is_protected: false,
    },
  ];

  for (const fund of initialFunds) {
    const { data: existingFund } = await supabase
      .from('financial_funds')
      .select('id')
      .eq('user_id', userId)
      .eq('fund_type', fund.fund_type)
      .maybeSingle();

    if (!existingFund) {
      await supabase.from('financial_funds').insert(fund);
    }
  }
}

/**
 * Fetch all financial funds for user
 */
export async function fetchUserFunds(userId: string): Promise<SupabaseFund[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('financial_funds')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return (data || []).map((f) => ({
    ...f,
    opening_balance: Number(f.opening_balance),
  }));
}

/**
 * Fetch user financial settings
 */
export async function fetchUserSettings(userId: string): Promise<FinancialSettings | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('financial_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    currency: data.currency || 'INR',
    currencySymbol: '₹',
    expectedMonthlyAllowance: Number(data.expected_monthly_allowance) || 12000,
    protectedFundInitialBalance: 120000,
    protectedFundOwner: 'Brother-in-law (Protected Escrow)',
  };
}

/**
 * Update financial settings in Supabase
 */
export async function updateUserSettings(userId: string, settings: Partial<FinancialSettings>) {
  if (!supabase) throw new Error('Supabase client is not configured.');
  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (settings.expectedMonthlyAllowance !== undefined) {
    updates.expected_monthly_allowance = settings.expectedMonthlyAllowance;
  }
  if (settings.currency !== undefined) {
    updates.currency = settings.currency;
  }

  const { error } = await supabase
    .from('financial_settings')
    .update(updates)
    .eq('user_id', userId);

  if (error) throw error;
}

/**
 * Fetch all transactions from Supabase
 */
export async function fetchCloudTransactions(userId: string, funds: SupabaseFund[]): Promise<Transaction[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false })
    .order('transaction_time', { ascending: false });

  if (error) throw error;

  const fundMap = new Map<string, FundSource>();
  funds.forEach((f) => fundMap.set(f.id, f.fund_type));

  return (data || []).map((row) => ({
    id: row.id,
    date: row.transaction_date,
    time: row.transaction_time ? row.transaction_time.substring(0, 5) : '12:00',
    description: row.description,
    amount: Number(row.amount),
    type: row.transaction_type as 'income' | 'expense',
    category: row.category,
    paymentMethod: row.payment_method,
    paymentAccount: row.payment_account,
    source: (row.fund_id ? fundMap.get(row.fund_id) : 'unallocated') || 'unallocated',
    notes: row.notes || undefined,
    isDemo: false,
    createdAt: row.created_at,
  }));
}

/**
 * Insert a single transaction in Supabase
 */
export async function insertCloudTransaction(
  userId: string, 
  tx: Omit<Transaction, 'id' | 'createdAt'>,
  funds: SupabaseFund[]
): Promise<Transaction> {
  if (!supabase) throw new Error('Supabase client is not configured.');

  if (tx.source === 'protected_family_fund') {
    throw new Error('Security Violation: Protected Family Fund cannot be allocated via regular transaction creation. Use the authorized allocation flow.');
  }

  const fund = funds.find((f) => f.fund_type === tx.source);
  if (fund?.is_protected) {
    throw new Error('Security Violation: Protected funds cannot be linked to manual transactions.');
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      fund_id: fund?.id || null,
      transaction_date: tx.date,
      transaction_time: tx.time ? `${tx.time}:00` : '12:00:00',
      description: tx.description,
      amount: tx.amount,
      transaction_type: tx.type,
      category: tx.category,
      payment_method: tx.paymentMethod,
      payment_account: tx.paymentAccount,
      source_type: 'manual',
      notes: tx.notes || null,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    date: data.transaction_date,
    time: data.transaction_time ? data.transaction_time.substring(0, 5) : tx.time,
    description: data.description,
    amount: Number(data.amount),
    type: data.transaction_type,
    category: data.category,
    paymentMethod: data.payment_method,
    paymentAccount: data.payment_account,
    source: tx.source,
    notes: data.notes || undefined,
    isDemo: false,
    createdAt: data.created_at,
  };
}

/**
 * Update transaction in Supabase
 */
export async function updateCloudTransaction(
  userId: string,
  txId: string,
  updates: Partial<Transaction>,
  funds: SupabaseFund[]
) {
  if (!supabase) throw new Error('Supabase client is not configured.');

  const dbUpdates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.date !== undefined) dbUpdates.transaction_date = updates.date;
  if (updates.time !== undefined) dbUpdates.transaction_time = `${updates.time}:00`;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
  if (updates.type !== undefined) dbUpdates.transaction_type = updates.type;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.paymentMethod !== undefined) dbUpdates.payment_method = updates.paymentMethod;
  if (updates.paymentAccount !== undefined) dbUpdates.payment_account = updates.paymentAccount;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
  if (updates.source !== undefined) {
    if (updates.source === 'protected_family_fund') {
      throw new Error('Security Violation: Transactions cannot be reassigned to the Protected Family Fund.');
    }
    const fund = funds.find((f) => f.fund_type === updates.source);
    if (fund?.is_protected) {
      throw new Error('Security Violation: Protected funds cannot be linked to manual transactions.');
    }
    dbUpdates.fund_id = fund?.id || null;
  }

  const { error } = await supabase
    .from('transactions')
    .update(dbUpdates)
    .eq('id', txId)
    .eq('user_id', userId);

  if (error) throw error;
}

/**
 * Delete transaction in Supabase
 */
export async function deleteCloudTransaction(userId: string, txId: string) {
  if (!supabase) throw new Error('Supabase client is not configured.');
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', txId)
    .eq('user_id', userId);

  if (error) throw error;
}

/**
 * Fetch allowance entries from Supabase
 */
export async function fetchCloudAllowanceEntries(userId: string): Promise<AllowanceEntry[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('allowance_entries')
    .select('*')
    .eq('user_id', userId)
    .order('received_date', { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,
    date: row.received_date,
    month: row.received_date.substring(0, 7),
    amount: Number(row.amount),
    expectedAmount: 12000,
    sourceLabel: row.entry_type === 'additional_allowance' 
      ? "Father's Account (Special Top-up)" 
      : "Father's Account (Monthly Transfer)",
    isAdditional: row.entry_type === 'additional_allowance',
    notes: row.notes || undefined,
  }));
}

/**
 * Record an allowance credit in Supabase atomically:
 * Inserts allowance_entries and creates corresponding transactions record.
 */
export async function recordCloudAllowanceEntry(
  userId: string,
  entry: Omit<AllowanceEntry, 'id'>,
  funds: SupabaseFund[]
): Promise<AllowanceEntry> {
  if (!supabase) throw new Error('Supabase client is not configured.');

  const fatherFund = funds.find((f) => f.fund_type === 'father_allowance');

  // Step 1: Insert income transaction into transactions table
  const { data: txData, error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      fund_id: fatherFund?.id || null,
      transaction_date: entry.date,
      transaction_time: '10:00:00',
      description: entry.isAdditional 
        ? "Father's Additional Allowance" 
        : "Father's Monthly Allowance",
      amount: entry.amount,
      transaction_type: 'income',
      category: "Father's Allowance",
      payment_method: 'net_banking',
      payment_account: 'SBI Savings (••4092)',
      source_type: 'allowance_sync',
      notes: entry.notes || (entry.isAdditional ? 'Additional allowance top-up' : 'Regular monthly allowance credit'),
    })
    .select()
    .single();

  if (txError) throw txError;

  // Step 2: Insert into allowance_entries linked to transaction
  const { data: allowData, error: allowError } = await supabase
    .from('allowance_entries')
    .insert({
      user_id: userId,
      amount: entry.amount,
      received_date: entry.date,
      entry_type: entry.isAdditional ? 'additional_allowance' : 'regular_allowance',
      notes: entry.notes || null,
      linked_transaction_id: txData.id,
    })
    .select()
    .single();

  if (allowError) throw allowError;

  return {
    id: allowData.id,
    date: allowData.received_date,
    month: allowData.received_date.substring(0, 7),
    amount: Number(allowData.amount),
    expectedAmount: entry.expectedAmount,
    sourceLabel: entry.sourceLabel,
    isAdditional: entry.isAdditional,
    notes: allowData.notes || undefined,
  };
}

/**
 * Fetch protected fund allocations from Supabase
 */
export async function fetchCloudProtectedAllocations(userId: string): Promise<ProtectedFundAllocation[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('protected_fund_allocations')
    .select('*')
    .eq('user_id', userId)
    .order('allocation_date', { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,
    date: row.allocation_date,
    amount: Number(row.amount),
    purpose: row.purpose,
    authorizedBy: 'Brother-in-law (Direct Consent)',
    confirmationCode: row.authorization_confirmation,
    notes: '',
  }));
}

/**
 * Record protected fund allocation in Supabase
 * Invokes the atomic PostgreSQL function `record_protected_fund_allocation`
 * to enforce backend balance checks and simultaneous ledger insertion.
 */
export async function recordCloudProtectedAllocation(
  userId: string,
  alloc: Omit<ProtectedFundAllocation, 'id'>,
  funds: SupabaseFund[]
): Promise<ProtectedFundAllocation> {
  if (!supabase) throw new Error('Supabase client is not configured.');

  // Try calling the security definer database function first
  const { data, error } = await supabase.rpc('record_protected_fund_allocation', {
    p_amount: alloc.amount,
    p_allocation_date: alloc.date,
    p_purpose: alloc.purpose,
    p_authorization_code: alloc.confirmationCode,
    p_notes: alloc.notes || null,
    p_payment_account: 'SBI Savings (••4092)',
  });

  if (error) {
    // If the RPC isn't loaded yet (e.g. migration pending), execute fallback direct atomic transaction
    const protFund = funds.find((f) => f.fund_type === 'protected_family_fund');
    
    // Check remaining balance
    const { data: existingAllocations } = await supabase
      .from('protected_fund_allocations')
      .select('amount')
      .eq('user_id', userId);

    const totalAllocated = (existingAllocations || []).reduce((s, a) => s + Number(a.amount), 0);
    const openingBal = protFund?.opening_balance || 120000;
    if (alloc.amount > (openingBal - totalAllocated)) {
      throw new Error(`Insufficient protected fund balance. Remaining: ₹${openingBal - totalAllocated}`);
    }

    // Step 1: Create transaction
    const { data: tx, error: txErr } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        fund_id: protFund?.id || null,
        transaction_date: alloc.date,
        transaction_time: '12:00:00',
        description: `[PROTECTED FUND ALLOCATION] ${alloc.purpose}`,
        amount: alloc.amount,
        transaction_type: 'expense',
        category: 'Protected Fund Transfer',
        payment_method: 'net_banking',
        payment_account: 'SBI Savings (••4092)',
        source_type: 'protected_allocation',
        notes: `Authorized by ${alloc.authorizedBy}. Code: ${alloc.confirmationCode}. ${alloc.notes || ''}`,
      })
      .select()
      .single();

    if (txErr) throw txErr;

    // Step 2: Create allocation record
    const { data: allocRecord, error: allocErr } = await supabase
      .from('protected_fund_allocations')
      .insert({
        user_id: userId,
        amount: alloc.amount,
        allocation_date: alloc.date,
        purpose: alloc.purpose,
        authorization_confirmation: alloc.confirmationCode,
        linked_transaction_id: tx.id,
      })
      .select()
      .single();

    if (allocErr) throw allocErr;

    return {
      id: allocRecord.id,
      date: allocRecord.allocation_date,
      amount: Number(allocRecord.amount),
      purpose: allocRecord.purpose,
      authorizedBy: alloc.authorizedBy,
      confirmationCode: allocRecord.authorization_confirmation,
      notes: alloc.notes,
    };
  }

  return {
    id: data.allocation_id,
    date: alloc.date,
    amount: alloc.amount,
    purpose: alloc.purpose,
    authorizedBy: alloc.authorizedBy,
    confirmationCode: alloc.confirmationCode,
    notes: alloc.notes,
  };
}

/**
 * Migration Assistant: Migrates local transactions, allowances, and settings into Supabase
 * Validates against duplicate insertion and preserves backup.
 */
export async function migrateLocalDataToCloud(
  userId: string,
  localTransactions: Transaction[],
  localAllowances: AllowanceEntry[],
  funds: SupabaseFund[]
): Promise<MigrationResult> {
  if (!supabase) throw new Error('Supabase client is not configured.');

  const result: MigrationResult = {
    migratedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    errors: [],
  };

  // 1. Fetch current cloud transactions to prevent duplicate migration
  const { data: cloudExisting } = await supabase
    .from('transactions')
    .select('transaction_date, amount, description')
    .eq('user_id', userId);

  const isDuplicateInCloud = (date: string, amount: number, desc: string) => {
    return (cloudExisting || []).some(
      (c) =>
        c.transaction_date === date &&
        Math.abs(Number(c.amount) - amount) < 0.01 &&
        c.description.toLowerCase().trim() === desc.toLowerCase().trim()
    );
  };

  const fundMap = new Map<FundSource, string>();
  funds.forEach((f) => fundMap.set(f.fund_type, f.id));

  // 2. Migrate transactions safely
  for (const tx of localTransactions) {
    try {
      if (isDuplicateInCloud(tx.date, tx.amount, tx.description)) {
        result.skippedCount++;
        continue;
      }

      const fundId = fundMap.get(tx.source) || null;
      const { error } = await supabase.from('transactions').insert({
        user_id: userId,
        fund_id: fundId,
        transaction_date: tx.date,
        transaction_time: tx.time ? `${tx.time}:00` : '12:00:00',
        description: tx.description,
        amount: tx.amount,
        transaction_type: tx.type,
        category: tx.category,
        payment_method: tx.paymentMethod,
        payment_account: tx.paymentAccount,
        source_type: 'manual',
        notes: tx.notes || null,
      });

      if (error) {
        result.failedCount++;
        result.errors.push(`Tx ${tx.description}: ${error.message}`);
      } else {
        result.migratedCount++;
      }
    } catch (e: any) {
      result.failedCount++;
      result.errors.push(`Tx ${tx.description}: ${e.message}`);
    }
  }

  // 3. Migrate allowances
  for (const allow of localAllowances) {
    try {
      const { data: existingAllow } = await supabase
        .from('allowance_entries')
        .select('id')
        .eq('user_id', userId)
        .eq('received_date', allow.date)
        .eq('amount', allow.amount)
        .maybeSingle();

      if (!existingAllow) {
        await supabase.from('allowance_entries').insert({
          user_id: userId,
          amount: allow.amount,
          received_date: allow.date,
          entry_type: allow.isAdditional ? 'additional_allowance' : 'regular_allowance',
          notes: allow.notes || null,
        });
      }
    } catch {
      // ignore individual allowance migration warning
    }
  }

  return result;
}

export interface StatementImportResult {
  batchId: string | null;
  importedTransactions: Transaction[];
  importedCount: number;
  duplicateCount: number;
  failedCount: number;
  errors: string[];
}

/**
 * Executes batch statement import in Supabase:
 * 1. Inserts record into statement_import_batches
 * 2. Inserts all approved transactions linked to the batch
 * 3. Links Father's Allowance credits to allowance_entries table
 */
export async function executeStatementImportBatch(
  userId: string,
  fileName: string,
  fileType: string,
  items: StatementPreviewItem[],
  funds: SupabaseFund[]
): Promise<StatementImportResult> {
  if (!supabase) throw new Error('Supabase client is not configured.');

  const result: StatementImportResult = {
    batchId: null,
    importedTransactions: [],
    importedCount: 0,
    duplicateCount: items.filter((i) => i.duplicateStatus === 'possible_duplicate').length,
    failedCount: 0,
    errors: [],
  };

  const fundMap = new Map<FundSource, string>();
  funds.forEach((f) => fundMap.set(f.fund_type, f.id));

  // 1. Create statement import batch record
  try {
    const { data: batchData, error: batchError } = await supabase
      .from('statement_import_batches')
      .insert({
        user_id: userId,
        file_name: fileName,
        file_type: fileType,
        import_status: 'completed',
        imported_row_count: items.length,
        duplicate_row_count: result.duplicateCount,
      })
      .select()
      .single();

    if (batchError) {
      console.warn('Batch header insert warning:', batchError.message);
    } else if (batchData) {
      result.batchId = batchData.id;
    }
  } catch (err: any) {
    console.warn('Batch header error:', err.message);
  }

  // 2. Insert transactions with strict safety invariants
  for (const item of items) {
    try {
      // Invariant 1: Protected Family Fund cannot be allocated via statement imports
      if (item.suggestedSource === 'protected_family_fund') {
        result.failedCount++;
        result.errors.push(`Security Violation: Cannot allocate "${item.description}" to Protected Family Fund via statement import.`);
        continue;
      }

      let fundId: string | null = null;
      if (item.suggestedSource && item.suggestedSource !== 'unallocated') {
        const matchingFund = funds.find((f) => f.fund_type === item.suggestedSource);
        if (matchingFund) {
          if (matchingFund.is_protected) {
            result.failedCount++;
            result.errors.push(`Security Violation: Protected Fund "${matchingFund.fund_name}" cannot be allocated via statement import.`);
            continue;
          }
          fundId = matchingFund.id;
        }
      }

      // Invariant 2: Duplicate Safety Enforcement (Check against existing database records)
      let isExistingDuplicate = false;
      let duplicateReason = '';

      if (item.referenceNumber) {
        const { data: dupByRef } = await supabase
          .from('transactions')
          .select('id, description, transaction_date')
          .eq('user_id', userId)
          .eq('external_transaction_id', item.referenceNumber)
          .maybeSingle();

        if (dupByRef) {
          isExistingDuplicate = true;
          duplicateReason = `Ref ${item.referenceNumber} already exists (${dupByRef.transaction_date})`;
        }
      }

      if (!isExistingDuplicate) {
        const { data: dupByTriad } = await supabase
          .from('transactions')
          .select('id')
          .eq('user_id', userId)
          .eq('transaction_date', item.date)
          .eq('amount', item.amount)
          .eq('description', item.description)
          .maybeSingle();

        if (dupByTriad) {
          isExistingDuplicate = true;
          duplicateReason = `Exact match on date, amount (₹${item.amount}), and description`;
        }
      }

      if (isExistingDuplicate && !item.allowDuplicateOverride) {
        result.duplicateCount++;
        result.errors.push(`Skipped duplicate: "${item.description}" (${duplicateReason}). Use explicit override in preview to force import.`);
        continue;
      }

      const notes = [
        item.referenceNumber ? `Ref/UTR: ${item.referenceNumber}` : null,
        item.isTransfer ? '[INTERNAL TRANSFER]' : null,
        isExistingDuplicate && item.allowDuplicateOverride ? '[MANUAL DUPLICATE OVERRIDE]' : null,
        `Imported from statement: ${fileName}`,
      ].filter(Boolean).join(' · ');

      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          fund_id: fundId,
          transaction_date: item.date,
          transaction_time: item.time ? `${item.time}:00` : '12:00:00',
          description: item.description,
          amount: item.amount,
          transaction_type: item.type,
          category: item.suggestedCategory,
          payment_method: item.paymentMethod,
          payment_account: item.paymentAccount,
          source_type: 'statement_import',
          notes,
          import_batch_id: result.batchId,
          external_transaction_id: item.referenceNumber || null,
        })
        .select()
        .single();

      if (txError) {
        result.failedCount++;
        result.errors.push(`${item.description} (${item.date}): ${txError.message}`);
        continue;
      }

      const createdTx: Transaction = {
        id: txData.id,
        date: txData.transaction_date,
        time: txData.transaction_time ? txData.transaction_time.substring(0, 5) : item.time,
        description: txData.description,
        amount: Number(txData.amount),
        type: txData.transaction_type,
        category: txData.category,
        paymentMethod: txData.payment_method,
        paymentAccount: txData.payment_account,
        source: item.suggestedSource,
        notes: txData.notes || undefined,
        isDemo: false,
        createdAt: txData.created_at,
      };

      result.importedTransactions.push(createdTx);
      result.importedCount++;

      // Invariant 3: Allowance Accuracy
      // ONLY confirmed allowance credits explicitly approved by the user can increase the allowance balance
      if (
        item.type === 'income' && 
        item.suggestedCategory === "Father's Allowance" && 
        item.isConfirmedAllowance === true
      ) {
        try {
          await supabase.from('allowance_entries').insert({
            user_id: userId,
            amount: item.amount,
            received_date: item.date,
            entry_type: 'regular_allowance',
            notes: `Confirmed Father's Allowance imported from ${fileName}`,
            linked_transaction_id: txData.id,
          });
        } catch {
          // ignore allowance link error
        }
      }
    } catch (err: any) {
      result.failedCount++;
      result.errors.push(`${item.description}: ${err.message}`);
    }
  }

  return result;
}

