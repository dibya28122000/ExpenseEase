import React from 'react';
import { Menu, Plus, Calendar } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatDate, getCurrentDateString } from '../../utils/formatters';

interface TopBarProps {
  onOpenMobileMenu: () => void;
  onOpenAddModal: () => void;
  onOpenAuthModal: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenMobileMenu,
  onOpenAddModal,
  onOpenAuthModal,
}) => {
  const { 
    activeTab, 
    currentUser, 
    isCloudConnected, 
    isConfigured, 
    signOut, 
    cloudSyncing 
  } = useFinance();

  const titleMap: Record<string, string> = {
    dashboard: 'Financial Dashboard',
    transactions: 'Transaction Ledger',
    'daily-reports': 'Daily Spending Report',
    'monthly-reports': 'Monthly Spending Report',
    'allowance-tracker': "Father's Allowance Tracker",
    'protected-fund': 'Protected Family Fund',
    'statement-import': 'Statement Import Preparation',
    settings: 'Application Settings',
  };

  const todayStr = getCurrentDateString();

  return (
    <header className="h-16 px-4 sm:px-6 bg-white border-b border-slate-200/90 flex items-center justify-between gap-4 sticky top-0 z-30">
      {/* Zone 1: Mobile Hamburger + Breadcrumb/View Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Open mobile navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="hidden sm:inline">ExpenseEase</span>
            <span className="hidden sm:inline" aria-hidden="true">/</span>
            <span className="truncate">{titleMap[activeTab] || 'Overview'}</span>
          </div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate leading-tight">
            {titleMap[activeTab] || 'Overview'}
          </h1>
        </div>
      </div>

      {/* Zone 2: Date context & Cloud status */}
      <div className="hidden md:flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60 font-mono tabular-nums">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>Today: {formatDate(todayStr)}</span>
        </div>

        {isCloudConnected && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span className="font-medium">Supabase Cloud</span>
            {cloudSyncing && <span className="text-[10px] text-emerald-600 animate-pulse">(syncing)</span>}
          </div>
        )}
      </div>

      {/* Zone 3: Actions & Account */}
      <div className="flex items-center gap-2 shrink-0">
        {currentUser ? (
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-right">
              <span className="text-xs font-semibold text-slate-900 block leading-tight truncate max-w-[120px]">
                {currentUser.user_metadata?.display_name || currentUser.email?.split('@')[0]}
              </span>
              <span className="text-[10px] text-slate-500 font-mono block">Cloud Active</span>
            </div>
            <button
              onClick={signOut}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
              title="Sign out of Supabase"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200"
          >
            {isConfigured ? 'Sign In / Register' : 'Connect Supabase'}
          </button>
        )}

        <button
          onClick={onOpenAddModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Transaction</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>
    </header>
  );
};
