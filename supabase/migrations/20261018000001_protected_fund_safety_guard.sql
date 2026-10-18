-- ============================================================================
-- ExpenseEase Database Migration: Protected Family Fund Safety Guard
-- File: 20261018000001_protected_fund_safety_guard.sql
-- Purpose: Database engine-level invariant preventing ANY transaction with
--          source_type != 'protected_allocation' from linking to an is_protected fund.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trg_enforce_protected_fund_isolation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_is_protected BOOLEAN := false;
BEGIN
    IF NEW.fund_id IS NOT NULL THEN
        SELECT is_protected INTO v_is_protected
        FROM public.financial_funds
        WHERE id = NEW.fund_id;

        IF v_is_protected = true AND (NEW.source_type IS NULL OR NEW.source_type != 'protected_allocation') THEN
            RAISE EXCEPTION 'Security Violation: The protected family fund can ONLY be linked via authorized protected_allocation records, never via statement_import or regular transactions (attempted source_type: %).', COALESCE(NEW.source_type, 'NULL');
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protected_fund_isolation ON public.transactions;
CREATE TRIGGER trg_protected_fund_isolation
    BEFORE INSERT OR UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_enforce_protected_fund_isolation();

-- Unique constraint index on transactions (user_id, external_transaction_id)
-- where external_transaction_id IS NOT NULL to prevent duplicate collision at DB level
CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_user_external_id 
    ON public.transactions(user_id, external_transaction_id) 
    WHERE external_transaction_id IS NOT NULL;
