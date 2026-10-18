import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Transaction, TransactionType, FundSource, PaymentMethod } from '../../types/finance';
import { CATEGORIES_LIST, PAYMENT_ACCOUNTS } from '../../utils/demoData';
import { getCurrentDateString, getCurrentTimeString } from '../../utils/formatters';
import { AlertTriangle } from 'lucide-react';

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Transaction, 'id' | 'createdAt'>) => void;
  editingTransaction?: Transaction | null;
}

export const TransactionFormModal: React.FC<TransactionFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingTransaction,
}) => {
  const [date, setDate] = useState(getCurrentDateString());
  const [time, setTime] = useState(getCurrentTimeString());
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState(CATEGORIES_LIST[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [paymentAccount, setPaymentAccount] = useState(PAYMENT_ACCOUNTS[0]);
  const [source, setSource] = useState<FundSource>('father_allowance');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingTransaction) {
      setDate(editingTransaction.date);
      setTime(editingTransaction.time || getCurrentTimeString());
      setDescription(editingTransaction.description);
      setAmount(editingTransaction.amount.toString());
      setType(editingTransaction.type);
      if (CATEGORIES_LIST.includes(editingTransaction.category)) {
        setCategory(editingTransaction.category);
        setCustomCategory('');
      } else {
        setCategory('Other');
        setCustomCategory(editingTransaction.category);
      }
      setPaymentMethod(editingTransaction.paymentMethod);
      setPaymentAccount(editingTransaction.paymentAccount);
      setSource(editingTransaction.source);
      setNotes(editingTransaction.notes || '');
    } else {
      // Reset form
      setDate(getCurrentDateString());
      setTime(getCurrentTimeString());
      setDescription('');
      setAmount('');
      setType('expense');
      setCategory(CATEGORIES_LIST[0]);
      setCustomCategory('');
      setPaymentMethod('upi');
      setPaymentAccount(PAYMENT_ACCOUNTS[0]);
      setSource('father_allowance');
      setNotes('');
    }
    setError(null);
  }, [editingTransaction, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (!description.trim()) {
      setError('Please provide a brief description.');
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0 || !Number.isFinite(numAmount)) {
      setError('Please enter a valid amount greater than ₹0.');
      return;
    }
    if (numAmount > 100000000) {
      setError('Amount exceeds the maximum permissible single transaction limit of ₹10,00,00,000.');
      return;
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('Please select a valid transaction date (YYYY-MM-DD).');
      return;
    }
    const yearVal = parseInt(date.split('-')[0], 10);
    if (yearVal < 2000 || yearVal > 2100) {
      setError('Transaction date year must be between 2000 and 2100.');
      return;
    }
    if (!time || !/^\d{2}:\d{2}$/.test(time)) {
      setError('Please provide a valid transaction time (HH:MM).');
      return;
    }

    const finalCategory = category === 'Other' && customCategory.trim() 
      ? customCategory.trim() 
      : category;

    onSubmit({
      date,
      time,
      description: description.trim(),
      amount: numAmount,
      type,
      category: finalCategory,
      paymentMethod,
      paymentAccount,
      source,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingTransaction ? 'Edit Transaction' : 'Record New Transaction'}
      subtitle="Demo session entry — changes update the in-browser records"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Transaction Type Segmented Toggle */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-700">Transaction Type</label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                if (source === 'other_income') setSource('father_allowance');
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                type === 'expense'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                if (category === 'Groceries & Food') setCategory("Father's Allowance");
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                type === 'income'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Income
            </button>
          </div>
        </div>

        {/* Amount & Description */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1 space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Amount (INR ₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-sm">₹</span>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 tabular-nums font-mono font-medium"
                required
              />
            </div>
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Description</label>
            <input
              type="text"
              placeholder="e.g. Milk & Bread, Metro card topup"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              required
            />
          </div>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-mono text-xs"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-mono text-xs"
              required
            />
          </div>
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-700">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
          >
            {CATEGORIES_LIST.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value="Other">Custom Category...</option>
          </select>
          {category === 'Other' && (
            <input
              type="text"
              placeholder="Enter category name"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              className="mt-2 w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              required
            />
          )}
        </div>

        {/* Money Source vs Payment Account distinction (Requirement 8) */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 space-y-3">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Funding & Account Attribution
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Source of Money</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as FundSource)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-800"
              >
                <option value="father_allowance">Father's Allowance</option>
                <option value="other_income">Other Income (Freelance / Gifts)</option>
                <option value="personal_savings">Personal Savings</option>
                <option value="protected_family_fund">Protected Family Fund (Requires Confirmation)</option>
              </select>
              <p className="text-[11px] text-slate-500">Which fund does this belong to?</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Payment Account Used</label>
              <select
                value={paymentAccount}
                onChange={(e) => setPaymentAccount(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-800"
              >
                {PAYMENT_ACCOUNTS.map((acc) => (
                  <option key={acc} value={acc}>
                    {acc}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">Physical bank / instrument utilized</p>
            </div>
          </div>

          {source === 'protected_family_fund' && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>Warning:</strong> The Protected Family Fund belongs to your brother-in-law. Allocating an expense to this fund will mark it as an explicit family fund deduction.
              </span>
            </div>
          )}
        </div>

        {/* Payment Method */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-700">Payment Method</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
            {[
              { id: 'upi', label: 'UPI' },
              { id: 'net_banking', label: 'NetBank' },
              { id: 'debit_card', label: 'Debit' },
              { id: 'credit_card', label: 'Credit' },
              { id: 'cash', label: 'Cash' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                className={`py-1.5 px-2 text-xs font-medium rounded-lg border text-center transition-all ${
                  paymentMethod === m.id
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-700">Notes (Optional)</label>
          <input
            type="text"
            placeholder="Add merchant reference, purpose, or receipt memo..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs"
          >
            {editingTransaction ? 'Save Changes' : 'Add Transaction'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
