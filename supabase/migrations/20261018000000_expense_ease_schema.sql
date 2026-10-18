-- ExpenseEase Phase 2: PostgreSQL Schema, Tables, Indexes, Functions, and Row-Level Security
-- Schema Version: 20261018000000

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. TABLES DEFINITIONS
-- ============================================================================

-- A. PROFILES
-- Stores basic application profile metadata linked to Supabase auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- B. FINANCIAL SETTINGS
-- Stores individual user financial planning benchmarks (expected allowance, currency, timezone)
CREATE TABLE IF NOT EXISTS public.financial_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    expected_monthly_allowance NUMERIC(12, 2) NOT NULL DEFAULT 12000.00 CHECK (expected_monthly_allowance >= 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_financial_settings_user UNIQUE (user_id)
);

-- C. FINANCIAL FUNDS
-- Segregates separate money pools (Father's Allowance, Protected Family Fund, Other Income)
CREATE TABLE IF NOT EXISTS public.financial_funds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fund_name TEXT NOT NULL,
    fund_type TEXT NOT NULL CHECK (fund_type IN ('father_allowance', 'protected_family_fund', 'other_income', 'personal_savings')),
    opening_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (opening_balance >= 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    is_protected BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_financial_funds_user_type UNIQUE (user_id, fund_type)
);

-- G. STATEMENT IMPORT BATCHES
-- Metadata and duplicate audit tracking for uploaded statements
CREATE TABLE IF NOT EXISTS public.statement_import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    import_status TEXT NOT NULL DEFAULT 'completed' CHECK (import_status IN ('pending', 'processing', 'completed', 'failed')),
    imported_row_count INTEGER NOT NULL DEFAULT 0 CHECK (imported_row_count >= 0),
    duplicate_row_count INTEGER NOT NULL DEFAULT 0 CHECK (duplicate_row_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- D. TRANSACTIONS
-- Master financial ledger lines with fund attribution and payment accounts
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fund_id UUID REFERENCES public.financial_funds(id) ON DELETE SET NULL,
    transaction_date DATE NOT NULL,
    transaction_time TIME WITHOUT TIME ZONE DEFAULT '12:00:00',
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
    category TEXT NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('upi', 'net_banking', 'debit_card', 'credit_card', 'cash')),
    payment_account TEXT NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'statement_import', 'allowance_sync', 'protected_allocation')),
    notes TEXT,
    import_batch_id UUID REFERENCES public.statement_import_batches(id) ON DELETE SET NULL,
    external_transaction_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- E. ALLOWANCE ENTRIES
-- Auditable log of monthly and additional top-up allowances received from father
CREATE TABLE IF NOT EXISTS public.allowance_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    received_date DATE NOT NULL,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('regular_allowance', 'additional_allowance')),
    notes TEXT,
    linked_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- F. PROTECTED FUND ALLOCATIONS
-- Immutable audit log of explicit, authorized deductions from the brother-in-law fund
CREATE TABLE IF NOT EXISTS public.protected_fund_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    allocation_date DATE NOT NULL,
    purpose TEXT NOT NULL,
    authorization_confirmation TEXT NOT NULL,
    linked_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 3. INDEXES FOR PERFORMANCE AND COMMON REPORTING QUERIES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON public.transactions(user_id, transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_user_fund ON public.transactions(user_id, fund_id);
CREATE INDEX IF NOT EXISTS idx_transactions_import_batch ON public.transactions(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_allowance_user_date ON public.allowance_entries(user_id, received_date DESC);
CREATE INDEX IF NOT EXISTS idx_protected_alloc_user_date ON public.protected_fund_allocations(user_id, allocation_date DESC);
CREATE INDEX IF NOT EXISTS idx_funds_user_type ON public.financial_funds(user_id, fund_type);

-- ============================================================================
-- 4. ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowance_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protected_fund_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statement_import_batches ENABLE ROW LEVEL SECURITY;

-- A. PROFILES POLICIES
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- B. FINANCIAL SETTINGS POLICIES
CREATE POLICY "Users can view own financial settings"
    ON public.financial_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own financial settings"
    ON public.financial_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own financial settings"
    ON public.financial_settings FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- C. FINANCIAL FUNDS POLICIES
CREATE POLICY "Users can view own financial funds"
    ON public.financial_funds FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own financial funds"
    ON public.financial_funds FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own financial funds"
    ON public.financial_funds FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- D. TRANSACTIONS POLICIES
CREATE POLICY "Users can view own transactions"
    ON public.transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
    ON public.transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
    ON public.transactions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
    ON public.transactions FOR DELETE
    USING (auth.uid() = user_id);

-- E. ALLOWANCE ENTRIES POLICIES
CREATE POLICY "Users can view own allowance entries"
    ON public.allowance_entries FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own allowance entries"
    ON public.allowance_entries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own allowance entries"
    ON public.allowance_entries FOR DELETE
    USING (auth.uid() = user_id);

-- F. PROTECTED FUND ALLOCATIONS POLICIES
CREATE POLICY "Users can view own protected fund allocations"
    ON public.protected_fund_allocations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own protected fund allocations"
    ON public.protected_fund_allocations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- G. STATEMENT IMPORT BATCHES POLICIES
CREATE POLICY "Users can view own statement import batches"
    ON public.statement_import_batches FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own statement import batches"
    ON public.statement_import_batches FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 5. DATABASE FUNCTIONS & PROCEDURES
-- ============================================================================

-- Function: Initialize new user financial profile and funds safely
CREATE OR REPLACE FUNCTION public.initialize_user_finances(
    p_user_id UUID,
    p_display_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_fund_id UUID;
BEGIN
    -- 1. Ensure profile exists
    INSERT INTO public.profiles (id, display_name)
    VALUES (p_user_id, COALESCE(p_display_name, 'ExpenseEase User'))
    ON CONFLICT (id) DO UPDATE SET updated_at = now();

    -- 2. Ensure default financial settings (₹12,000 allowance, Asia/Kolkata)
    INSERT INTO public.financial_settings (user_id, expected_monthly_allowance, currency, timezone)
    VALUES (p_user_id, 12000.00, 'INR', 'Asia/Kolkata')
    ON CONFLICT (user_id) DO NOTHING;

    -- 3. Ensure initial financial funds
    -- A. Father's Allowance
    INSERT INTO public.financial_funds (user_id, fund_name, fund_type, opening_balance, currency, is_protected)
    VALUES (p_user_id, 'Father''s Allowance', 'father_allowance', 0.00, 'INR', false)
    ON CONFLICT (user_id, fund_type) DO NOTHING;

    -- B. Protected Family Fund (₹1,20,000 initial reference baseline for brother-in-law)
    INSERT INTO public.financial_funds (user_id, fund_name, fund_type, opening_balance, currency, is_protected)
    VALUES (p_user_id, 'Protected Family Fund', 'protected_family_fund', 120000.00, 'INR', true)
    ON CONFLICT (user_id, fund_type) DO NOTHING;

    -- C. Other Income
    INSERT INTO public.financial_funds (user_id, fund_name, fund_type, opening_balance, currency, is_protected)
    VALUES (p_user_id, 'Other Income', 'other_income', 0.00, 'INR', false)
    ON CONFLICT (user_id, fund_type) DO NOTHING;

    -- D. Personal Savings
    INSERT INTO public.financial_funds (user_id, fund_name, fund_type, opening_balance, currency, is_protected)
    VALUES (p_user_id, 'Personal Savings', 'personal_savings', 0.00, 'INR', false)
    ON CONFLICT (user_id, fund_type) DO NOTHING;

    RETURN jsonb_build_object('status', 'success', 'user_id', p_user_id);
END;
$$;

-- Trigger to run initialize_user_finances on new Supabase auth sign-up
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    PERFORM public.initialize_user_finances(
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_created();

-- Function: Atomic Protected Fund Allocation
-- Enforces backend balance check, ensures atomicity between transaction and allocation
CREATE OR REPLACE FUNCTION public.record_protected_fund_allocation(
    p_amount NUMERIC(12, 2),
    p_allocation_date DATE,
    p_purpose TEXT,
    p_authorization_code TEXT,
    p_notes TEXT DEFAULT NULL,
    p_payment_account TEXT DEFAULT 'SBI Savings (••4092)'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID;
    v_fund_id UUID;
    v_opening_balance NUMERIC(12, 2);
    v_total_allocated NUMERIC(12, 2);
    v_remaining_balance NUMERIC(12, 2);
    v_tx_id UUID;
    v_alloc_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Allocation amount must be strictly positive.';
    END IF;

    IF TRIM(p_purpose) IS NULL OR TRIM(p_purpose) = '' THEN
        RAISE EXCEPTION 'An explicit purpose is required to allocate protected funds.';
    END IF;

    -- Find protected fund
    SELECT id, opening_balance INTO v_fund_id, v_opening_balance
    FROM public.financial_funds
    WHERE user_id = v_user_id AND fund_type = 'protected_family_fund' AND is_protected = true;

    IF v_fund_id IS NULL THEN
        RAISE EXCEPTION 'Protected family fund record not found.';
    END IF;

    -- Compute current total already allocated
    SELECT COALESCE(SUM(amount), 0.00) INTO v_total_allocated
    FROM public.protected_fund_allocations
    WHERE user_id = v_user_id;

    v_remaining_balance := v_opening_balance - v_total_allocated;

    IF p_amount > v_remaining_balance THEN
        RAISE EXCEPTION 'Cannot allocate %; remaining protected balance is only %.', p_amount, v_remaining_balance;
    END IF;

    -- Atomic Step 1: Create transaction record
    INSERT INTO public.transactions (
        user_id,
        fund_id,
        transaction_date,
        transaction_time,
        description,
        amount,
        transaction_type,
        category,
        payment_method,
        payment_account,
        source_type,
        notes
    ) VALUES (
        v_user_id,
        v_fund_id,
        p_allocation_date,
        '12:00:00',
        '[PROTECTED FUND ALLOCATION] ' || p_purpose,
        p_amount,
        'expense',
        'Protected Fund Transfer',
        'net_banking',
        p_payment_account,
        'protected_allocation',
        COALESCE(p_notes, 'Explicit allocation authorized with code: ' || p_authorization_code)
    ) RETURNING id INTO v_tx_id;

    -- Atomic Step 2: Create protected_fund_allocations record linked to transaction
    INSERT INTO public.protected_fund_allocations (
        user_id,
        amount,
        allocation_date,
        purpose,
        authorization_confirmation,
        linked_transaction_id
    ) VALUES (
        v_user_id,
        p_amount,
        p_allocation_date,
        p_purpose,
        p_authorization_code,
        v_tx_id
    ) RETURNING id INTO v_alloc_id;

    RETURN jsonb_build_object(
        'status', 'success',
        'allocation_id', v_alloc_id,
        'transaction_id', v_tx_id,
        'new_protected_balance', v_remaining_balance - p_amount
    );
END;
$$;
