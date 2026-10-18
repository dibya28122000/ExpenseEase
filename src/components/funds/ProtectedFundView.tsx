import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  AlertTriangle, 
  CheckCircle2, 
  Key, 
  FileCheck, 
  Info,
  Clock
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { StatCard } from '../common/StatCard';
import { Modal } from '../common/Modal';
import { formatINR, formatDate, getCurrentDateString } from '../../utils/formatters';

export const ProtectedFundView: React.FC = () => {
  const { 
    protectedAllocations, 
    addProtectedAllocation, 
    settings, 
    transactions 
  } = useFinance();

  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  // Form states
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [authorizedBy, setAuthorizedBy] = useState('Brother-in-law (Direct Consent)');
  const [notes, setNotes] = useState('');
  const [confirmInput, setConfirmInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Calculations
  const totalAllocated = protectedAllocations.reduce((sum, item) => sum + item.amount, 0);
  const currentBalance = settings.protectedFundInitialBalance - totalAllocated;
  const isIntact = totalAllocated === 0;

  // Filter any transactions recorded against protected fund
  const protectedTransactions = transactions.filter(
    (t) => t.source === 'protected_family_fund'
  );

  const handleOpenModal = () => {
    setStep(1);
    setAmount('');
    setPurpose('');
    setAuthorizedBy('Brother-in-law (Direct Consent)');
    setNotes('');
    setConfirmInput('');
    setError(null);
    setIsAllocationModalOpen(true);
  };

  const handleStep1Proceed = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid allocation amount greater than ₹0.');
      return;
    }
    if (numAmount > currentBalance) {
      setError(`Cannot allocate more than the remaining protected balance of ${formatINR(currentBalance)}.`);
      return;
    }
    if (!purpose.trim()) {
      setError('An explicit purpose or justification is strictly required for this protected fund.');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmInput.trim().toUpperCase() !== 'CONFIRM') {
      setError('Please type CONFIRM exactly as shown to authorize this allocation.');
      return;
    }

    const numAmount = parseFloat(amount);
    const confirmationCode = `PROT-AUTH-${Date.now().toString().slice(-6)}`;

    addProtectedAllocation({
      date: getCurrentDateString(),
      amount: numAmount,
      purpose: purpose.trim(),
      authorizedBy: authorizedBy.trim(),
      confirmationCode,
      notes: notes.trim(),
    });

    setIsAllocationModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Strict Security Shield */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-widest text-indigo-300">
                Protected Escrow Protocol · Fund Source B
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Protected Family Fund
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              This fund belongs to your <strong>brother-in-law</strong> and is maintained under strict escrow protection. ExpenseEase will <strong>never automatically deduct, transfer, or spend</strong> from this fund—even if monthly spending exceeds your regular allowance.
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row md:flex-col gap-2">
            <button
              onClick={handleOpenModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 transition-colors shadow-xs"
            >
              <Key className="w-4 h-4 text-slate-900" />
              Authorize Allocation
            </button>
            <div className="text-[11px] text-slate-400 text-center font-mono">
              Requires 2-step verification
            </div>
          </div>
        </div>
      </div>

      {/* 4 Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Protected Balance"
          amount={currentBalance}
          subtitle="Current intact fund"
          icon={<ShieldCheck className="w-4 h-4 text-indigo-600" />}
          highlight={true}
          badgeText={isIntact ? '100% Intact' : 'Partially Allocated'}
        />

        <StatCard
          title="Initial Reference Capital"
          amount={settings.protectedFundInitialBalance}
          subtitle="Baseline brother-in-law escrow"
          icon={<Lock className="w-4 h-4 text-slate-600" />}
        />

        <StatCard
          title="Explicitly Allocated"
          amount={totalAllocated}
          subtitle={`${protectedAllocations.length} authorized allocation${protectedAllocations.length === 1 ? '' : 's'}`}
          icon={<FileCheck className="w-4 h-4 text-slate-600" />}
        />

        <StatCard
          title="Security Enforcement"
          amount={0}
          subtitle="Zero automatic deductions"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          customValue="LOCKED"
          badgeText="Active"
        />
      </div>

      {/* Protection Rules & Isolation Architecture Box */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-600" />
          Fund Protection & Isolation Rules
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
            <span className="font-semibold text-slate-900 block">1. Legal & Familial Ownership</span>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Every rupee in this ₹1,20,000 baseline belongs exclusively to your brother-in-law. It is segregated from daily pocket spending and father's monthly allowance.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
            <span className="font-semibold text-slate-900 block">2. Non-Automatic Deductions</span>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Even if your monthly expenses cross the ₹12,000 allowance limit, the app will never debit this reserve. Deficits remain marked under the allowance source.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
            <span className="font-semibold text-slate-900 block">3. Immutable Audit Trail</span>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Any authorized release creates an explicit timestamped allocation entry with a generated confirmation code, recorded purpose, and authorized signatory.
            </p>
          </div>
        </div>
      </div>

      {/* Transaction & Allocation Ledgers */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Protected Fund Allocation Ledger</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Historical record of authorized debits against brother-in-law's fund
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {protectedAllocations.length} records
          </span>
        </div>

        {protectedAllocations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] uppercase font-semibold text-slate-500 tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date & Auth Code</th>
                  <th className="py-3 px-4">Purpose / Memo</th>
                  <th className="py-3 px-4">Authorized By</th>
                  <th className="py-3 px-4 text-right">Amount (INR)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {protectedAllocations.map((alloc) => (
                  <tr key={alloc.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono">
                      <div className="font-bold text-slate-900">{formatDate(alloc.date)}</div>
                      <div className="text-[10px] text-slate-500">{alloc.confirmationCode}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{alloc.purpose}</div>
                      {alloc.notes && <div className="text-[11px] text-slate-500 mt-0.5 italic">{alloc.notes}</div>}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{alloc.authorizedBy}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-rose-600">
                      -{formatINR(alloc.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3" />
                        Authorized
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Protected Fund is 100% Intact</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No allocations or deductions have been made against this ₹1,20,000 family fund. The entire principal remains secured.
            </p>
          </div>
        )}
      </div>

      {/* Explicit 2-Step Allocation Modal */}
      <Modal
        isOpen={isAllocationModalOpen}
        onClose={() => setIsAllocationModalOpen(false)}
        title={step === 1 ? 'Step 1: Allocation Request Details' : 'Step 2: Explicit Security Authorization'}
        subtitle="Protected Family Fund (Brother-in-law)"
        maxWidth="lg"
      >
        {step === 1 ? (
          <form onSubmit={handleStep1Proceed} className="space-y-4">
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-950 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
              <span>
                You are requesting to allocate money from your brother-in-law's protected fund. This must be an explicit, agreed transfer.
              </span>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Allocation Amount (INR)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-sm">₹</span>
                <input
                  type="number"
                  min="1"
                  max={currentBalance}
                  placeholder="e.g. 15000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden font-mono font-medium"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-500">Available: {formatINR(currentBalance)}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Specific Purpose & Justification</label>
              <input
                type="text"
                placeholder="e.g. Family medical emergency / Authorized loan repayment"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Authorization / Consent Record</label>
              <input
                type="text"
                value={authorizedBy}
                onChange={(e) => setAuthorizedBy(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Additional Notes</label>
              <input
                type="text"
                placeholder="e.g. Discussed via call on 18 Oct 2026"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAllocationModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs"
              >
                Continue to Step 2 →
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleFinalSubmit} className="space-y-4">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-950 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                FINAL CONFIRMATION REQUIRED
              </div>
              <p>
                You are about to record an irrevocable deduction of <strong>{formatINR(parseFloat(amount) || 0)}</strong> from the brother-in-law protected fund.
              </p>
              <div className="text-[11px] font-mono bg-white/80 p-2 rounded border border-rose-200">
                Purpose: {purpose} <br />
                Authorized By: {authorizedBy}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">
                Type <strong>CONFIRM</strong> in capital letters to authorize:
              </label>
              <input
                type="text"
                placeholder="CONFIRM"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden font-mono tracking-wider font-bold uppercase"
                required
              />
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                ← Back to Details
              </button>
              <button
                type="submit"
                disabled={confirmInput.trim().toUpperCase() !== 'CONFIRM'}
                className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-xs"
              >
                Authorize & Record Deduction
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
