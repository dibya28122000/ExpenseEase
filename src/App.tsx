import React, { useState } from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { MobileNav } from './components/layout/MobileNav';
import { TransactionFormModal } from './components/common/TransactionFormModal';
import { AuthModal } from './components/auth/AuthModal';
import { MigrationModal } from './components/migration/MigrationModal';
import { Transaction } from './types/finance';

// Views
import { DashboardView } from './components/dashboard/DashboardView';
import { TransactionsView } from './components/transactions/TransactionsView';
import { DailyReportsView } from './components/reports/DailyReportsView';
import { MonthlyReportsView } from './components/reports/MonthlyReportsView';
import { AllowanceTrackerView } from './components/funds/AllowanceTrackerView';
import { ProtectedFundView } from './components/funds/ProtectedFundView';
import { StatementImportView } from './components/import/StatementImportView';
import { SettingsView } from './components/settings/SettingsView';

const MainLayout: React.FC = () => {
  const { activeTab, addTransaction, updateTransaction } = useFinance();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const handleOpenAddModal = () => {
    setEditingTransaction(null);
    setIsTxModalOpen(true);
  };

  const handleOpenEditModal = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsTxModalOpen(true);
  };

  const handleTxSubmit = async (data: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (editingTransaction) {
      await updateTransaction(editingTransaction.id, data);
    } else {
      await addTransaction(data);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Desktop Left Sidebar */}
      <Sidebar className="hidden lg:flex" />

      {/* Mobile Slide-Over Navigation */}
      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <TopBar
          onOpenMobileMenu={() => setIsMobileNavOpen(true)}
          onOpenAddModal={handleOpenAddModal}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
        />

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {activeTab === 'dashboard' && (
              <DashboardView
                onOpenAddModal={handleOpenAddModal}
                onOpenAuthModal={() => setIsAuthModalOpen(true)}
                onOpenMigrationModal={() => setIsMigrationModalOpen(true)}
              />
            )}

            {activeTab === 'transactions' && (
              <TransactionsView
                onOpenAddModal={handleOpenAddModal}
                onEditTransaction={handleOpenEditModal}
              />
            )}

            {activeTab === 'daily-reports' && (
              <DailyReportsView onOpenAddModal={handleOpenAddModal} />
            )}

            {activeTab === 'monthly-reports' && <MonthlyReportsView />}

            {activeTab === 'allowance-tracker' && <AllowanceTrackerView />}

            {activeTab === 'protected-fund' && <ProtectedFundView />}

            {activeTab === 'statement-import' && <StatementImportView />}

            {activeTab === 'settings' && (
              <SettingsView
                onOpenAuthModal={() => setIsAuthModalOpen(true)}
                onOpenMigrationModal={() => setIsMigrationModalOpen(true)}
              />
            )}
          </div>
        </main>
      </div>

      {/* Add / Edit Transaction Modal */}
      <TransactionFormModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTransaction(null);
        }}
        onSubmit={handleTxSubmit}
        editingTransaction={editingTransaction}
      />

      {/* Supabase Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
        }}
      />

      {/* Migration Assistant Modal */}
      <MigrationModal
        isOpen={isMigrationModalOpen}
        onClose={() => setIsMigrationModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <FinanceProvider>
      <MainLayout />
    </FinanceProvider>
  );
}
