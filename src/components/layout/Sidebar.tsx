import React from 'react';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Calendar, 
  CalendarRange, 
  PiggyBank, 
  ShieldCheck, 
  FileSpreadsheet, 
  Settings,
  Wallet,
} from 'lucide-react';
import { ActiveNavTab } from '../../types/finance';
import { useFinance } from '../../context/FinanceContext';
import { formatINR } from '../../utils/formatters';

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ className = '', onNavigate }) => {
  const { activeTab, setActiveTab, dashboardMetrics } = useFinance();

  const navItems: { id: ActiveNavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: <ArrowLeftRight className="w-4 h-4" />,
    },
    {
      id: 'daily-reports',
      label: 'Daily Reports',
      icon: <Calendar className="w-4 h-4" />,
    },
    {
      id: 'monthly-reports',
      label: 'Monthly Reports',
      icon: <CalendarRange className="w-4 h-4" />,
    },
    {
      id: 'allowance-tracker',
      label: 'Allowance Tracker',
      icon: <PiggyBank className="w-4 h-4" />,
    },
    {
      id: 'protected-fund',
      label: 'Protected Fund Tracker',
      icon: <ShieldCheck className="w-4 h-4" />,
      badge: 'Protected',
    },
    {
      id: 'statement-import',
      label: 'Statement Import',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      badge: 'Prep',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  const handleSelect = (tab: ActiveNavTab) => {
    setActiveTab(tab);
    if (onNavigate) onNavigate();
  };

  return (
    <aside className={`w-64 bg-white border-r border-slate-200/90 flex flex-col shrink-0 select-none ${className}`}>
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-slate-900 text-base leading-none block">
              ExpenseEase
            </span>
            <span className="text-[11px] text-slate-500 font-normal leading-tight block mt-0.5">
              Personal Finance Ledger
            </span>
          </div>
        </div>
      </div>

      {/* Navigation links */}
      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
        <div className="px-3 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Main Navigation
        </div>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap text-left ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={isActive ? 'text-white' : 'text-slate-500'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                    isActive
                      ? 'bg-slate-800 text-slate-300'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Quick Fund Status Bar at sidebar bottom */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
        <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
            <span className="flex items-center gap-1 font-medium">
              <PiggyBank className="w-3.5 h-3.5 text-emerald-600" />
              Allowance Rem.
            </span>
            {dashboardMetrics.isAllowanceConfigured ? (
              <span className="font-mono tabular-nums font-semibold text-slate-800">
                {formatINR(dashboardMetrics.remainingAllowance)}
              </span>
            ) : (
              <span className="text-[11px] font-normal text-slate-400">
                Not configured
              </span>
            )}
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all"
              style={{
                width: `${
                  dashboardMetrics.isAllowanceConfigured && dashboardMetrics.monthlyAllowanceReceived > 0
                    ? Math.max(0, Math.min(100, (dashboardMetrics.remainingAllowance / dashboardMetrics.monthlyAllowanceReceived) * 100))
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              Protected Fund
            </span>
            {dashboardMetrics.isProtectedFundConfigured ? (
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {formatINR(dashboardMetrics.protectedFundBalance)}
              </span>
            ) : (
              <span className="text-[11px] font-normal text-slate-400">
                Not configured
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {dashboardMetrics.isProtectedFundConfigured
              ? '100% Protected (Brother-in-law)'
              : 'Escrow unconfigured'}
          </p>
        </div>
      </div>
    </aside>
  );
};
