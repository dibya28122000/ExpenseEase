import React from 'react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  PiggyBank, 
  ShieldCheck, 
  TrendingDown, 
  Calendar,
  ChevronRight,
  PlusCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { StatCard } from '../common/StatCard';
import { DemoBanner } from '../common/DemoBanner';
import { SpendingCharts } from './SpendingCharts';
import { formatINR, formatDate, formatTime, SOURCE_LABELS } from '../../utils/formatters';

interface DashboardViewProps {
  onOpenAddModal: () => void;
  onOpenAuthModal?: () => void;
  onOpenMigrationModal?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
  onOpenAddModal, 
  onOpenAuthModal, 
  onOpenMigrationModal 
}) => {
  const { 
    dashboardMetrics, 
    setActiveTab, 
    setSelectedDate, 
    setSelectedMonth 
  } = useFinance();

  return (
    <div className="space-y-6">
      {/* Demo / Cloud Data Banner */}
      <DemoBanner 
        onOpenAuthModal={onOpenAuthModal} 
        onOpenMigrationModal={onOpenMigrationModal} 
      />

      {/* Main Metric Cards Grid (6 primary cards required) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. Today's Total Expenses */}
        <StatCard
          title="Today's Expenses"
          amount={dashboardMetrics.todayExpenses}
          subtitle="Outflow for today"
          icon={<TrendingDown className="w-4 h-4 text-rose-600" />}
          trendDirection="down"
        />

        {/* 2. This Month's Total Expenses */}
        <StatCard
          title="This Month's Spend"
          amount={dashboardMetrics.thisMonthExpenses}
          subtitle="Cumulative month total"
          icon={<ArrowUpRight className="w-4 h-4 text-slate-700" />}
        />

        {/* 3. Monthly Allowance Received */}
        <StatCard
          title="Allowance Received"
          amount={dashboardMetrics.monthlyAllowanceReceived}
          subtitle="From Father's account"
          icon={<PiggyBank className="w-4 h-4 text-emerald-600" />}
          trendDirection="up"
        />

        {/* 4. Remaining Allowance */}
        <StatCard
          title="Remaining Allowance"
          amount={dashboardMetrics.isAllowanceConfigured ? dashboardMetrics.remainingAllowance : 0}
          customValue={dashboardMetrics.isAllowanceConfigured ? undefined : "Not configured"}
          subtitle={
            dashboardMetrics.isAllowanceConfigured
              ? dashboardMetrics.remainingAllowance >= 0 ? "Under allowance" : "Exceeded allowance"
              : "Allowance not configured"
          }
          icon={<PiggyBank className="w-4 h-4 text-emerald-700" />}
          trendDirection={dashboardMetrics.isAllowanceConfigured ? (dashboardMetrics.remainingAllowance >= 0 ? 'up' : 'down') : 'neutral'}
          highlight={dashboardMetrics.isAllowanceConfigured && dashboardMetrics.remainingAllowance < 0}
          badgeText={dashboardMetrics.isAllowanceConfigured ? (dashboardMetrics.remainingAllowance >= 0 ? 'Surplus' : 'Deficit') : undefined}
        />

        {/* 5. Protected Family Fund Balance */}
        <StatCard
          title="Protected Family Fund"
          amount={dashboardMetrics.isProtectedFundConfigured ? dashboardMetrics.protectedFundBalance : 0}
          customValue={dashboardMetrics.isProtectedFundConfigured ? undefined : "Not configured"}
          subtitle={dashboardMetrics.isProtectedFundConfigured ? "Brother-in-law (Locked)" : "Fund not configured"}
          icon={<ShieldCheck className="w-4 h-4 text-indigo-600" />}
          badgeText={dashboardMetrics.isProtectedFundConfigured ? "Protected" : undefined}
          highlight={false}
          onClick={() => setActiveTab('protected-fund')}
        />

        {/* 6. Total Income */}
        <StatCard
          title="Total Month Income"
          amount={dashboardMetrics.totalIncomeThisMonth}
          subtitle="All sources combined"
          icon={<ArrowDownLeft className="w-4 h-4 text-emerald-600" />}
          trendDirection="up"
        />
      </div>

      {/* Spending Charts (Daily, Monthly, Category) */}
      <SpendingCharts
        dailyData={dashboardMetrics.dailySpendingChartData}
        monthlyData={dashboardMetrics.monthlySpendingChartData}
        categoryData={dashboardMetrics.categoryExpenseChartData}
      />

      {/* Quick Navigation Hub & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions (2 cols on lg) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Recent Transactions</h3>
              <p className="text-xs text-slate-500 mt-0.5">Latest recorded expenses and income entries</p>
            </div>
            <button
              onClick={() => setActiveTab('transactions')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-900 hover:text-slate-700 transition-colors"
            >
              View All
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {dashboardMetrics.recentTransactions.length > 0 ? (
              dashboardMetrics.recentTransactions.map((tx) => (
                <div key={tx.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.type === 'income'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {tx.type === 'income' ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900 truncate">
                          {tx.description}
                        </span>
                        {tx.source === 'protected_family_fund' && (
                          <span className="text-[10px] font-semibold bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded shrink-0">
                            Protected Fund
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span>{formatDate(tx.date)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatTime(tx.time)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{tx.category}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`text-sm font-bold font-mono tabular-nums ${
                        tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {formatINR(tx.amount)}
                    </div>
                    <div className="text-[11px] text-slate-600 truncate max-w-[140px]">
                      {tx.paymentAccount}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center">
                <p className="text-xs font-semibold text-slate-700">No recent transactions recorded.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Your recorded expenses and income line items will appear here.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions & Navigation Hub */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Quick Navigation</h3>
            <p className="text-xs text-slate-500 mb-4">Direct access to detailed financial views</p>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setSelectedDate(new Date().toISOString().split('T')[0]);
                  setActiveTab('daily-reports');
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50 text-left transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block">Daily Report</span>
                    <span className="text-[11px] text-slate-500 block">Audit day-by-day calendar logs</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => {
                  setSelectedMonth(new Date().toISOString().substring(0, 7));
                  setActiveTab('monthly-reports');
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50 text-left transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block">Monthly Report</span>
                    <span className="text-[11px] text-slate-500 block">Month trends & category breakdown</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => setActiveTab('allowance-tracker')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50 text-left transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                    <PiggyBank className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block">Father's Allowance</span>
                    <span className="text-[11px] text-slate-500 block">Track receipts & monthly limits</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => setActiveTab('protected-fund')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-indigo-100 bg-indigo-50/40 hover:bg-indigo-50/80 text-left transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-indigo-950 block">Protected Family Fund</span>
                    <span className="text-[11px] text-indigo-700 block">Brother-in-law Escrow Protocol</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-indigo-400" />
              </button>

              <button
                onClick={() => setActiveTab('statement-import')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50 text-left transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block">Statement Import</span>
                    <span className="text-[11px] text-slate-500 block">Upload bank statements & preview</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Quick Record CTA Banner */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xs">
            <h4 className="text-sm font-semibold mb-1">Record Daily Expense</h4>
            <p className="text-xs text-slate-300 mb-4">
              Add any cash, UPI, or card purchase to instantly update daily totals.
            </p>
            <button
              onClick={onOpenAddModal}
              className="w-full py-2.5 px-4 rounded-xl bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-4 h-4 text-slate-900" />
              Add Transaction
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
