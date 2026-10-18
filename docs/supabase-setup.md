# ExpenseEase — Supabase Setup & Architecture Guide

This guide explains how to provision, configure, and connect your Supabase PostgreSQL backend with ExpenseEase.

---

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and log in or create an account.
2. In the Supabase Dashboard, click **New Project**.
3. Choose an organization, enter a name (e.g. `expense-ease`), set a secure database password, and select your preferred region (e.g. `ap-south-1` Mumbai / India for low latency in Asia/Kolkata).
4. Click **Create new project** and wait ~2 minutes for provisioning to complete.

---

## 2. Obtain Project URL and Publishable Anon Key

1. In your Supabase Project dashboard, navigate to **Project Settings** (gear icon in the sidebar) → **API**.
2. Locate the following parameters:
   - **Project URL**: e.g., `https://abcdefghijklm.supabase.co`
   - **Project API Keys**: Copy the **`anon` (public)** key.
     - *Security Warning*: NEVER use the `service_role` key in frontend code or environment variables! Only the `anon` public key is permitted.

---

## 3. Configure Environment Variables

1. Copy `.env.example` to `.env` or set the environment variables in your deployment environment:
   ```env
   VITE_SUPABASE_URL="https://your-project-id.supabase.co"
   VITE_SUPABASE_ANON_KEY="eyJhbGciOi..."
   ```
2. Restart the Vite development server so the new `VITE_` variables are loaded into browser runtime.

---

## 4. Apply Database Schema & Row-Level Security

1. In the Supabase Dashboard, navigate to the **SQL Editor** tab (terminal icon `>_` on the left).
2. Click **New Query**.
3. Open `supabase/migrations/20261018000000_expense_ease_schema.sql` in ExpenseEase, copy the entire SQL script, and paste it into the Supabase SQL editor.
4. Click **Run** (green button).
5. Verify output:
   - Tables created: `profiles`, `financial_settings`, `financial_funds`, `transactions`, `allowance_entries`, `protected_fund_allocations`, `statement_import_batches`.
   - RLS enabled on all 7 tables with individual user ownership policies.
   - Database trigger `on_auth_user_created` and security definer function `record_protected_fund_allocation` installed.

---

## 5. Configure Authentication

1. In your Supabase Dashboard, navigate to **Authentication** → **Providers** → **Email**.
2. Verify **Enable Email provider** is turned on.
3. For local or prototype testing, under **Email Auth**, you can optionally toggle **Confirm email** off if you wish users to sign in immediately without waiting for verification emails.

---

## 6. How Data Isolation Works

- **Row-Level Security (RLS)** is strictly enforced at the PostgreSQL engine level. Every table requires `auth.uid() = user_id`. Even with direct REST or GraphQL requests, users can only read and mutate their own records.
- The **Protected Family Fund** (₹1,20,000 reference capital) is isolated on the backend. The database function `record_protected_fund_allocation` ensures that allocations are atomic, checked against available protected balances, and recorded simultaneously in both `transactions` and `protected_fund_allocations`.
- The **Local Migration Assistant** allows users to safely inspect their existing browser localStorage data and migrate it to Supabase after logging in, with built-in duplicate detection and rollback backups.
