import React, { useState } from 'react';
import { 
  Settings, 
  Download, 
  Check, 
  Database, 
  ShieldCheck, 
  PiggyBank, 
  FileCode2,
  Lock,
  ArrowRight,
  ExternalLink,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR } from '../../utils/formatters';

interface SettingsViewProps {
  onOpenAuthModal?: () => void;
  onOpenMigrationModal?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onOpenAuthModal,
  onOpenMigrationModal,
}) => {
  const { 
    settings, 
    updateSettings, 
    exportData,
    transactions,
    allowanceEntries,
    protectedAllocations,
    currentUser,
    isCloudConnected,
    isConfigured,
    signOut,
  } = useFinance();

  const [expectedAllowance, setExpectedAllowance] = useState(settings.expectedMonthlyAllowance.toString());
  const [protectedFundBalance, setProtectedFundBalance] = useState(settings.protectedFundInitialBalance.toString());
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const allowVal = parseFloat(expectedAllowance);
    const protVal = parseFloat(protectedFundBalance);

    if (!isNaN(allowVal) && allowVal > 0 && !isNaN(protVal) && protVal > 0) {
      await updateSettings({
        expectedMonthlyAllowance: allowVal,
        protectedFundInitialBalance: protVal,
        isAllowanceConfigured: true,
        isProtectedFundConfigured: true,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 text-white">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Application Settings</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Financial parameters, Supabase PostgreSQL database connection, and local data migration
            </p>
          </div>
        </div>
      </div>

      {/* Supabase Cloud Connection & Account Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Supabase Backend Status</h3>
              <p className="text-xs text-slate-500">PostgreSQL cloud persistence with Row-Level Security</p>
            </div>
          </div>

          <div>
            {isCloudConnected ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Connected & Synchronized
              </span>
            ) : isConfigured ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                <Lock className="w-3.5 h-3.5" />
                Authentication Required
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                Setup Required
              </span>
            )}
          </div>
        </div>

        {isCloudConnected && currentUser ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Authenticated User</span>
                <span className="font-semibold text-slate-900 truncate block mt-0.5">
                  {currentUser.email}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 block">User UUID</span>
                <span className="font-mono text-[10px] text-slate-600 truncate block mt-0.5">
                  {currentUser.id}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Row-Level Security</span>
                <span className="font-semibold text-emerald-700 block mt-0.5">
                  Enforced on all tables
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              {onOpenMigrationModal && (
                <button
                  onClick={onOpenMigrationModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200"
                >
                  <UploadCloud className="w-4 h-4 text-slate-700" />
                  Open Local Data Migration Assistant
                </button>
              )}
              <button
                onClick={signOut}
                className="px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-rose-200"
              >
                Sign Out from Supabase
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-600 leading-relaxed">
              ExpenseEase Phase 2 supports native Supabase PostgreSQL database storage and user authentication.
              {!isConfigured ? (
                <> Configure <code className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-900 font-mono text-[11px]">VITE_SUPABASE_URL</code> and <code className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-900 font-mono text-[11px]">VITE_SUPABASE_ANON_KEY</code> in your environment variables to connect your project.</>
              ) : (
                <> Credentials detected in environment. Sign in or register an account to sync your financial ledger to the cloud.</>
              )}
            </p>

            <div className="flex items-center gap-3 pt-1">
              {onOpenAuthModal && (
                <button
                  onClick={onOpenAuthModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs"
                >
                  <span>{isConfigured ? 'Sign In / Register Account' : 'Supabase Setup Instructions'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              <span className="text-[11px] text-slate-500 font-mono">
                Schema: <code className="text-slate-800">supabase/migrations/20261018000000_expense_ease_schema.sql</code>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Financial Benchmarks & Limits Form */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-semibold text-slate-900">Financial Fund Parameters</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Adjust baseline expectations for allowance tracking and protected family escrow
          </p>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <PiggyBank className="w-4 h-4 text-emerald-600" />
                Expected Monthly Allowance (Father)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-sm">₹</span>
                <input
                  type="number"
                  min="1"
                  value={expectedAllowance}
                  onChange={(e) => setExpectedAllowance(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden font-mono font-medium"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Default baseline: {formatINR(12000)} per calendar month
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Protected Family Fund Initial Capital
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-sm">₹</span>
                <input
                  type="number"
                  min="1"
                  value={protectedFundBalance}
                  onChange={(e) => setProtectedFundBalance(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden font-mono font-medium"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Brother-in-law's protected money: {formatINR(120000)}
              </p>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            {savedSuccess ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                <Check className="w-4 h-4 text-emerald-600" />
                Parameters updated in {isCloudConnected ? 'Supabase database' : 'local configuration'}!
              </span>
            ) : (
              <span className="text-xs text-slate-500 font-mono">
                Currency: Indian Rupee (INR ₹) · Timezone: Asia/Kolkata
              </span>
            )}
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs"
            >
              Update Parameters
            </button>
          </div>
        </form>
      </div>

      {/* Ledger Backup & Export Management */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-semibold text-slate-900">Ledger Data & Backup</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Current ledger holds {transactions.length} transactions, {allowanceEntries.length} allowance credits, and {protectedAllocations.length} protected allocations
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => exportData('csv')}
            className="flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-colors"
          >
            <Download className="w-4 h-4 text-slate-600" />
            Export Ledger as CSV
          </button>

          <button
            onClick={() => exportData('json')}
            className="flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-colors"
          >
            <FileCode2 className="w-4 h-4 text-slate-600" />
            Export Backup as JSON
          </button>
        </div>
      </div>
    </div>
  );
};
