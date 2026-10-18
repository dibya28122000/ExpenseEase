import React from 'react';
import { Lock, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

interface DemoBannerProps {
  onOpenAuthModal?: () => void;
  onOpenMigrationModal?: () => void;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({ 
  onOpenAuthModal, 
}) => {
  const { isCloudConnected, currentUser, cloudError, refreshCloudData } = useFinance();

  // If there's a cloud synchronization error, show a clean error state with retry
  if (cloudError) {
    return (
      <div 
        role="alert" 
        className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-900 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
      >
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-rose-950 block">Database Synchronization Error</span>
            <span className="text-rose-800 text-xs mt-0.5 block">{cloudError}</span>
          </div>
        </div>
        <button
          onClick={refreshCloudData}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border border-rose-200 text-rose-800 hover:bg-rose-100 transition-colors self-start sm:self-auto shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Connection
        </button>
      </div>
    );
  }

  // When user is authenticated, keep the dashboard clean without banner noise
  if (isCloudConnected && currentUser) {
    return null;
  }

  // When unauthenticated, show a clean, professional sign-in prompt (no orange demo warnings)
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-slate-900 text-white shrink-0">
          <Lock className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Sign in to access your personal financial ledger
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            Connect your authenticated account to record expenses, track your father's allowance, protect family escrow, and import statements.
          </p>
        </div>
      </div>

      {onOpenAuthModal && (
        <button
          onClick={onOpenAuthModal}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs shrink-0 self-start sm:self-auto"
        >
          <span>Sign In / Register</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
