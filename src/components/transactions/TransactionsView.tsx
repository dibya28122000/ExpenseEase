import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Plus, 
  Edit3, 
  Trash2, 
  ArrowDownLeft, 
  ArrowUpRight,
  ShieldAlert,
  Calendar,
  X,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Transaction, TransactionType, FundSource } from '../../types/finance';
import { 
  formatINR, 
  formatDate, 
  formatTime, 
  SOURCE_LABELS, 
  PAYMENT_METHOD_LABELS,
  getCurrentDateString,
  getMonthKey
} from '../../utils/formatters';
import { CATEGORIES_LIST } from '../../utils/demoData';

interface TransactionsViewProps {
  onOpenAddModal: () => void;
  onEditTransaction: (tx: Transaction) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  onOpenAddModal,
  onEditTransaction,
}) => {
  const { transactions, deleteTransaction } = useFinance();

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | FundSource>('all');
  const [dateQuickFilter, setDateQuickFilter] = useState<'all' | 'today' | 'this_month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const todayStr = getCurrentDateString();
  const thisMonthKey = getMonthKey(todayStr);

  // Filtered & sorted list
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesDesc = tx.description.toLowerCase().includes(query);
        const matchesNotes = tx.notes?.toLowerCase().includes(query) ?? false;
        const matchesCategory = tx.category.toLowerCase().includes(query);
        const matchesAccount = tx.paymentAccount.toLowerCase().includes(query);
        if (!matchesDesc && !matchesNotes && !matchesCategory && !matchesAccount) {
          return false;
        }
      }

      // Type filter
      if (typeFilter !== 'all' && tx.type !== typeFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && tx.category !== categoryFilter) {
        return false;
      }

      // Source filter
      if (sourceFilter !== 'all' && tx.source !== sourceFilter) {
        return false;
      }

      // Date quick filter
      if (dateQuickFilter === 'today' && tx.date !== todayStr) {
        return false;
      }
      if (dateQuickFilter === 'this_month' && getMonthKey(tx.date) !== thisMonthKey) {
        return false;
      }
      if (dateQuickFilter === 'custom') {
        if (customStartDate && tx.date < customStartDate) return false;
        if (customEndDate && tx.date > customEndDate) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'date_desc') {
        return `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`);
      }
      if (sortBy === 'date_asc') {
        return `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`);
      }
      if (sortBy === 'amount_desc') {
        return b.amount - a.amount;
      }
      if (sortBy === 'amount_asc') {
        return a.amount - b.amount;
      }
      return 0;
    });
  }, [
    transactions, 
    searchTerm, 
    typeFilter, 
    categoryFilter, 
    sourceFilter, 
    dateQuickFilter, 
    customStartDate, 
    customEndDate, 
    sortBy,
    todayStr,
    thisMonthKey
  ]);

  // Aggregate stats of filtered transactions
  const { totalExpense, totalIncome } = useMemo(() => {
    let exp = 0;
    let inc = 0;
    filteredTransactions.forEach((t) => {
      if (t.type === 'expense') exp += t.amount;
      else inc += t.amount;
    });
    return { totalExpense: exp, totalIncome: inc };
  }, [filteredTransactions]);

  const handleDelete = (id: string) => {
    deleteTransaction(id);
    setDeleteConfirmId(null);
  };

  const resetAllFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setCategoryFilter('all');
    setSourceFilter('all');
    setDateQuickFilter('all');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const hasActiveFilters = 
    searchTerm !== '' || 
    typeFilter !== 'all' || 
    categoryFilter !== 'all' || 
    sourceFilter !== 'all' || 
    dateQuickFilter !== 'all';

  return (
    <div className="space-y-5">
      {/* Header with Search and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Transaction Ledger</h2>
          <p className="text-xs text-slate-500">
            {filteredTransactions.length} of {transactions.length} transactions match current criteria
          </p>
        </div>

        <button
          onClick={onOpenAddModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Transaction
        </button>
      </div>

      {/* Filter and Search Bar Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
        {/* Row 1: Search and Type Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by description, merchant, account, or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Segmented buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setTypeFilter('all')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                typeFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setTypeFilter('expense')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                typeFilter === 'expense'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Expense
            </button>
            <button
              onClick={() => setTypeFilter('income')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                typeFilter === 'income'
                  ? 'bg-white text-emerald-700 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Income
            </button>
          </div>
        </div>

        {/* Row 2: Category, Source, Date range, and Sort Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 text-xs">
          {/* Category */}
          <div>
            <label className="text-[11px] font-medium text-slate-500 mb-1 block">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-hidden"
            >
              <option value="all">All Categories</option>
              {CATEGORIES_LIST.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Source Filter */}
          <div>
            <label className="text-[11px] font-medium text-slate-500 mb-1 block">Money Source</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-hidden"
            >
              <option value="all">All Sources</option>
              <option value="father_allowance">Father's Allowance</option>
              <option value="protected_family_fund">Protected Family Fund</option>
              <option value="other_income">Other Income</option>
              <option value="personal_savings">Personal Savings</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label className="text-[11px] font-medium text-slate-500 mb-1 block">Date Period</label>
            <select
              value={dateQuickFilter}
              onChange={(e) => setDateQuickFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-hidden"
            >
              <option value="all">All Dates</option>
              <option value="today">Today Only</option>
              <option value="this_month">This Month</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="text-[11px] font-medium text-slate-500 mb-1 block">Sort Order</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-hidden"
            >
              <option value="date_desc">Date: Newest First</option>
              <option value="date_asc">Date: Oldest First</option>
              <option value="amount_desc">Amount: High to Low</option>
              <option value="amount_asc">Amount: Low to High</option>
            </select>
          </div>
        </div>

        {/* Custom date range inputs when selected */}
        {dateQuickFilter === 'custom' && (
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">From:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
            />
            <span className="text-slate-500">To:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
            />
          </div>
        )}

        {/* Filter Summary & Reset Bar */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>Filters applied: showing {filteredTransactions.length} results</span>
            <button
              onClick={resetAllFilters}
              className="font-medium text-slate-900 hover:underline inline-flex items-center gap-1"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Filtered Totals Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-3 bg-white rounded-xl border border-slate-200/80">
          <span className="text-[11px] text-slate-500 block">Filtered Expenses</span>
          <span className="text-base font-bold text-slate-900 font-mono tabular-nums">
            {formatINR(totalExpense)}
          </span>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-200/80">
          <span className="text-[11px] text-slate-500 block">Filtered Income</span>
          <span className="text-base font-bold text-emerald-600 font-mono tabular-nums">
            {formatINR(totalIncome)}
          </span>
        </div>
        <div className="col-span-2 sm:col-span-1 p-3 bg-white rounded-xl border border-slate-200/80">
          <span className="text-[11px] text-slate-500 block">Net Filtered Flow</span>
          <span
            className={`text-base font-bold font-mono tabular-nums ${
              totalIncome - totalExpense >= 0 ? 'text-emerald-600' : 'text-slate-900'
            }`}
          >
            {formatINR(totalIncome - totalExpense)}
          </span>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] uppercase font-semibold text-slate-500 tracking-wider">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Source of Money</th>
                <th className="py-3 px-4">Account / Method</th>
                <th className="py-3 px-4 text-right">Amount (INR)</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Date & Time */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-900 font-mono">
                        {formatDate(tx.date)}
                      </div>
                      <div className="text-[11px] text-slate-600 font-mono mt-0.5">
                        {formatTime(tx.time)}
                      </div>
                    </td>

                    {/* Description & Notes */}
                    <td className="py-3 px-4 min-w-[200px]">
                      <div className="font-medium text-slate-900 flex items-center gap-1.5">
                        {tx.description}
                      </div>
                      {tx.notes && (
                        <div className="text-[11px] text-slate-600 mt-0.5 line-clamp-1 italic">
                          {tx.notes}
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-slate-700 font-medium">
                        {tx.category}
                      </span>
                    </td>

                    {/* Source of Money */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-slate-900 font-medium">
                        {SOURCE_LABELS[tx.source] || tx.source}
                      </div>
                      {tx.source === 'protected_family_fund' && (
                        <div className="text-[10px] text-rose-600 font-medium flex items-center gap-1 mt-0.5">
                          <ShieldAlert className="w-3 h-3" />
                          Protected Money
                        </div>
                      )}
                    </td>

                    {/* Payment Account & Method */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-slate-800">{tx.paymentAccount}</div>
                      <div className="text-[10px] text-slate-600 mt-0.5 uppercase tracking-wide">
                        {tx.paymentMethod}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono tabular-nums">
                      <span
                        className={`text-sm font-bold ${
                          tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}
                        {formatINR(tx.amount)}
                      </span>
                      <div className="text-[10px] text-slate-600 capitalize">
                        {tx.type}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onEditTransaction(tx)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit transaction"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(tx.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete transaction"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <p className="font-medium text-slate-700 mb-1">No transactions found</p>
                    <p className="text-xs text-slate-400">
                      Try clearing filters or recording a new transaction entry.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-slate-200 shadow-xl space-y-3">
            <h4 className="text-sm font-bold text-slate-900">Delete Transaction?</h4>
            <p className="text-xs text-slate-600">
              Are you sure you want to remove this transaction record? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
