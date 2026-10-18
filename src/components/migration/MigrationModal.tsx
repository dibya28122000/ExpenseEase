import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useFinance } from '../../context/FinanceContext';
import { migrateLocalDataToCloud, MigrationResult } from '../../services/supabaseService';
import { 
  Database, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  RefreshCw,
  FileCheck,
  ShieldCheck,
} from 'lucide-react';
import { formatINR, formatDate } from '../../utils/formatters';

interface MigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMigrationComplete?: () => void;
}

export const MigrationModal: React.FC<MigrationModalProps> = ({
  isOpen,
  onClose,
  onMigrationComplete,
}) => {
  const { 
    currentUser, 
    userFunds, 
    transactions, 
    allowanceEntries, 
    exportData,
    refreshCloudData,
  } = useFinance();

  const [hasDownloadedBackup, setHasDownloadedBackup] = useState(false);
  const [confirmedImportDemo, setConfirmedImportDemo] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadBackupFirst = () => {
    exportData('json');
    setHasDownloadedBackup(true);
  };

  const handleRunMigration = async () => {
    if (!currentUser) {
      setError('You must be signed in to Supabase to migrate local records.');
      return;
    }

    if (!confirmedImportDemo) {
      setError('Please explicitly confirm the checkbox to authorize migrating these local session records into your permanent cloud database.');
      return;
    }

    try {
      setIsMigrating(true);
      setError(null);

      const result = await migrateLocalDataToCloud(
        currentUser.id,
        transactions,
        allowanceEntries,
        userFunds
      );

      setMigrationResult(result);
      await refreshCloudData();

      if (onMigrationComplete) {
        onMigrationComplete();
      }
    } catch (err: any) {
      setError(err?.message || 'Migration encountered an error.');
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Migrate Local Records to Supabase Cloud"
      subtitle="Safe, verified import with duplicate prevention and backup retention"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Backup Requirement */}
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Download className="w-4 h-4 text-slate-700" />
              Step 1: Download Local JSON Backup
            </span>
            {hasDownloadedBackup ? (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Backup Saved
              </span>
            ) : (
              <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                Recommended First
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Preserve a snapshot of your current session ledger before initiating the cloud migration:
          </p>
          <button
            onClick={handleDownloadBackupFirst}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download Local Backup (.json)
          </button>
        </div>

        {/* Step 2: Preview of Records to Migrate */}
        <div className="border border-slate-200/80 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-900">
              Step 2: Review Local Records ({transactions.length} Transactions)
            </span>
            <span className="text-slate-500 font-mono">
              {allowanceEntries.length} allowance credits
            </span>
          </div>

          <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs border border-slate-100 rounded-lg">
            {transactions.slice(0, 8).map((tx) => (
              <div key={tx.id} className="p-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-slate-900 truncate">{tx.description}</div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {formatDate(tx.date)} · {tx.category} · {tx.paymentAccount}
                  </div>
                </div>
                <div className="text-right font-mono tabular-nums font-bold text-slate-900 shrink-0">
                  {formatINR(tx.amount)}
                </div>
              </div>
            ))}
          </div>
          {transactions.length > 8 && (
            <p className="text-[11px] text-slate-400 text-center font-mono">
              + {transactions.length - 8} additional records in migration batch
            </p>
          )}
        </div>

        {/* Explicit Confirmation Checkbox (Requirement 7) */}
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
          <label className="flex items-start gap-2.5 cursor-pointer text-xs text-amber-950 font-medium">
            <input
              type="checkbox"
              checked={confirmedImportDemo}
              onChange={(e) => setConfirmedImportDemo(e.target.checked)}
              className="mt-0.5 rounded border-amber-300 text-slate-900"
            />
            <span className="leading-relaxed">
              I explicitly confirm that I wish to import these {transactions.length} local records into my Supabase cloud account. Duplicates will be safely identified and skipped automatically.
            </span>
          </label>
        </div>

        {/* Migration Result Report */}
        {migrationResult && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs text-emerald-950">
            <div className="flex items-center gap-2 font-bold text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Migration Completed Successfully!
            </div>
            <div className="grid grid-cols-3 gap-2 font-mono text-center pt-1">
              <div className="bg-white p-2 rounded border border-emerald-200">
                <span className="text-[10px] text-slate-500 block">Migrated</span>
                <span className="font-bold text-emerald-700 text-sm">{migrationResult.migratedCount}</span>
              </div>
              <div className="bg-white p-2 rounded border border-emerald-200">
                <span className="text-[10px] text-slate-500 block">Skipped (Dups)</span>
                <span className="font-bold text-slate-700 text-sm">{migrationResult.skippedCount}</span>
              </div>
              <div className="bg-white p-2 rounded border border-emerald-200">
                <span className="text-[10px] text-slate-500 block">Failed</span>
                <span className="font-bold text-rose-700 text-sm">{migrationResult.failedCount}</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Close
          </button>

          {!migrationResult ? (
            <button
              onClick={handleRunMigration}
              disabled={isMigrating || !confirmedImportDemo}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none rounded-xl transition-colors shadow-xs"
            >
              {isMigrating ? (
                <span>Migrating...</span>
              ) : (
                <>
                  <span>Import into Supabase</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl transition-colors shadow-xs"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
