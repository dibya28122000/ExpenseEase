import React, { useState } from 'react';
import { 
  PiggyBank, 
  Plus, 
  ArrowDownLeft, 
  TrendingDown, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  FileText
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { StatCard } from '../common/StatCard';
import { Modal } from '../common/Modal';
import { formatINR, formatDate, formatTime, getCurrentDateString, getMonthKey } from '../../utils/formatters';

export const AllowanceTrackerView: React.FC = () => {
  const { 
    allowanceEntries, 
    addAllowanceEntry, 
    transactions, 
    settings,
    selectedMonth, 
    setSelectedMonth 
  } = useFinance();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [date, setDate] = useState(getCurrentDateString());
  const [amount, setAmount] = useState('12000');
  const [isAdditional, setIsAdditional] = useState(false);
  const [sourceLabel, setSourceLabel] = useState("Father's Bank Account (NEFT)");
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Current month allowance data
  const currentMonthEntries = allowanceEntries.filter((a) => a.month === selectedMonth);
  const totalReceivedThisMonth = currentMonthEntries.reduce((sum, a) => sum + a.amount, 0);

  // Expenses specifically allocated to father_allowance this month
  const monthExpensesAllocated = transactions.filter(
    (t) => t.type === 'expense' && t.source === 'father_allowance' && getMonthKey(t.date) === selectedMonth
  );
  const totalExpensesAllocated = monthExpensesAllocated.reduce((sum, t) => sum + t.amount, 0);

  const remainingAllowance = totalReceivedThisMonth - totalExpensesAllocated;
  const utilizationPercentage = totalReceivedThisMonth > 0 
    ? (totalExpensesAllocated / totalReceivedThisMonth) * 100 
    : 0;

  const handleRecordAllowance = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0 || !Number.isFinite(numAmount)) {
      setError('Please enter a valid allowance amount greater than ₹0.');
      return;
    }
    if (numAmount > 10000000) {
      setError('Amount exceeds the maximum permissible allowance limit.');
      return;
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('Please provide a valid date (YYYY-MM-DD).');
      return;
    }
    if (!sourceLabel.trim()) {
      setError('Please provide a transfer source label (e.g. Father SBI NEFT).');
      return;
    }

    addAllowanceEntry({
      date,
      month: getMonthKey(date),
      amount: numAmount,
      expectedAmount: settings.expectedMonthlyAllowance,
      sourceLabel: sourceLabel.trim(),
      isAdditional,
      notes: notes.trim() || undefined,
    });

    setIsAddModalOpen(false);
    setDate(getCurrentDateString());
    setAmount('12000');
    setIsAdditional(false);
    setNotes('');
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
            <PiggyBank className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Father's Allowance Tracker
              </h2>
              <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                Fund Source A
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Standard monthly allowance of {formatINR(settings.expectedMonthlyAllowance)} with independent tracking of top-ups & allocated spend
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Record Allowance Received
        </button>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Expected Monthly"
          amount={settings.expectedMonthlyAllowance}
          subtitle="Agreed monthly benchmark"
          icon={<Clock className="w-4 h-4 text-slate-600" />}
        />

        <StatCard
          title="Actual Received"
          amount={totalReceivedThisMonth}
          subtitle={`${currentMonthEntries.length} transfer${currentMonthEntries.length === 1 ? '' : 's'} recorded`}
          icon={<ArrowDownLeft className="w-4 h-4 text-emerald-600" />}
          trendDirection="up"
        />

        <StatCard
          title="Allocated Spend"
          amount={totalExpensesAllocated}
          subtitle={`${monthExpensesAllocated.length} expenses charged to allowance`}
          icon={<TrendingDown className="w-4 h-4 text-rose-600" />}
          trendDirection="down"
        />

        <StatCard
          title="Remaining Allowance"
          amount={remainingAllowance}
          subtitle={remainingAllowance >= 0 ? 'Available balance' : 'Over budget'}
          icon={<PiggyBank className="w-4 h-4 text-emerald-700" />}
          highlight={remainingAllowance < 0}
          trendDirection={remainingAllowance >= 0 ? 'up' : 'down'}
          badgeText={remainingAllowance >= 0 ? `${Math.round(100 - utilizationPercentage)}% left` : 'Deficit'}
        />
      </div>

      {/* Allowance Budget Utilization Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-slate-900">Monthly Allowance Utilization</span>
            <span className="text-slate-500 ml-2">
              Spent {formatINR(totalExpensesAllocated)} of {formatINR(totalReceivedThisMonth)}
            </span>
          </div>
          <span className="font-mono font-bold text-slate-900 tabular-nums">
            {Math.round(utilizationPercentage)}% Used
          </span>
        </div>

        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              utilizationPercentage > 100
                ? 'bg-rose-600'
                : utilizationPercentage > 85
                ? 'bg-amber-500'
                : 'bg-emerald-600'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, utilizationPercentage))}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <span>₹0</span>
          <span>Budget: {formatINR(settings.expectedMonthlyAllowance)}</span>
          <span>Received: {formatINR(totalReceivedThisMonth)}</span>
        </div>
      </div>

      {/* 2-Column Split: Allowance Receipts vs Expenses Allocated */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Allowance Intake History */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Allowance Credits History</h3>
                <p className="text-xs text-slate-500 mt-0.5">Funds received from father</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="text-xs font-semibold text-slate-900 hover:text-slate-700"
              >
                + Add Entry
              </button>
            </div>

            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {allowanceEntries.map((entry) => (
                <div key={entry.id} className="p-4 flex items-start justify-between gap-3 hover:bg-slate-50/70">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {entry.isAdditional ? "Additional Allowance Top-up" : "Regular Monthly Allowance"}
                      </span>
                      {entry.isAdditional && (
                        <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                          Top-up
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      {formatDate(entry.date)} · Month: {entry.month}
                    </div>
                    {entry.notes && (
                      <p className="text-[11px] text-slate-600 italic">
                        {entry.notes}
                      </p>
                    )}
                  </div>

                  <div className="text-right font-mono tabular-nums shrink-0">
                    <span className="text-sm font-bold text-emerald-600">
                      +{formatINR(entry.amount)}
                    </span>
                    <span className="text-[10px] text-slate-600 block mt-0.5">
                      {entry.sourceLabel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Expenses Allocated to Father's Allowance */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Expenses Charged to Allowance</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Transactions with money source: Father's Allowance ({monthExpensesAllocated.length})
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {monthExpensesAllocated.length > 0 ? (
                monthExpensesAllocated.map((tx) => (
                  <div key={tx.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {tx.description}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 font-mono">
                        <span>{formatDate(tx.date)}</span>
                        <span>·</span>
                        <span>{tx.category}</span>
                        <span>·</span>
                        <span>{tx.paymentAccount}</span>
                      </div>
                    </div>

                    <div className="text-right font-mono tabular-nums shrink-0">
                      <span className="text-xs font-bold text-slate-900">
                        -{formatINR(tx.amount)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  No expenses charged to Father's Allowance this month.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Record Allowance Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Record Allowance Received"
        subtitle="Log funds credited by father into your account"
      >
        <form onSubmit={handleRecordAllowance} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Allowance Type</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setIsAdditional(false);
                  setAmount(settings.expectedMonthlyAllowance.toString());
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  !isAdditional
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Standard Monthly ({formatINR(settings.expectedMonthlyAllowance)})
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdditional(true);
                  setAmount('3000');
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  isAdditional
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Additional Top-up
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Amount Received (INR)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-sm">₹</span>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden font-mono font-medium"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Date Received</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden font-mono text-xs"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Source Transfer Label</label>
            <input
              type="text"
              value={sourceLabel}
              onChange={(e) => setSourceLabel(e.target.value)}
              placeholder="e.g. Father's SBI Account (NEFT / IMPS)"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Advance allowance for festival season expenses"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs"
            >
              Record Credit
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
