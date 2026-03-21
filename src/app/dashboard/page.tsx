'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTransactions } from '@/lib/hooks/useTransactions';
import MonthSelector from '@/components/MonthSelector';
import BalanceCards from '@/components/BalanceCards';
import TransactionList from '@/components/TransactionList';
import TransactionForm from '@/components/TransactionForm';
import ToastContainer from '@/components/Toast';
import { MONTHS } from '@/types';
import { Plus, LogOut, Wallet, Trash2, Download, AlertTriangle } from 'lucide-react';
import { User } from '@supabase/supabase-js';

export default function DashboardPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const router = useRouter();
  const supabase = createClient();

  const {
    transactions,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    toggleStatus,
    makeRecurring,
    removeRecurrence,
    resetMonth,
    importPreviousMonth,
  } = useTransactions(month, year);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/login');
      } else {
        setUser(user);
        setCheckingAuth(false);
      }
    });
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const handleMonthChange = (newMonth: number, newYear: number) => {
    setMonth(newMonth);
    setYear(newYear);
  };

  const handleResetMonth = async () => {
    await resetMonth();
    setShowResetConfirm(false);
  };

  const handleImportPreviousMonth = async () => {
    await importPreviousMonth();
    setShowImportConfirm(false);
  };

  const prevMonthName = MONTHS[(month === 1 ? 12 : month - 1) - 1];

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <ToastContainer />

      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-30 safe-top">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Finanças</h1>
              <p className="text-xs text-slate-400 truncate max-w-[160px]">
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2.5 rounded-xl hover:bg-slate-700/50 active:bg-slate-700 transition-colors"
            aria-label="Sair"
          >
            <LogOut className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <MonthSelector month={month} year={year} onChange={handleMonthChange} />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
          </div>
        ) : (
          <>
            <BalanceCards transactions={transactions} />

            {/* Batch Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowImportConfirm(true)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800/40 border border-slate-700/40 text-xs font-medium text-slate-400 hover:bg-slate-800/60 hover:text-slate-300 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Importar {prevMonthName}
              </button>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800/40 border border-red-500/20 text-xs font-medium text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Resetar
              </button>
            </div>

            <TransactionList
              transactions={transactions}
              onToggleStatus={toggleStatus}
              onUpdate={updateTransaction}
              onDelete={deleteTransaction}
              onMakeRecurring={makeRecurring}
              onRemoveRecurrence={removeRecurrence}
            />
          </>
        )}
      </main>

      {/* FAB - Add Transaction */}
      <div className="fixed bottom-6 right-4 z-30 safe-bottom">
        <button
          onClick={() => setShowForm(true)}
          className="w-14 h-14 bg-emerald-500 hover:bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-500/30 flex items-center justify-center transition-all active:scale-90"
          aria-label="Adicionar transação"
        >
          <Plus className="w-7 h-7 text-white" />
        </button>
      </div>

      {/* Transaction Form Modal */}
      {showForm && (
        <TransactionForm
          onSubmit={addTransaction}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Reset Month Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowResetConfirm(false)} />
          <div className="relative w-full max-w-xs mx-4 bg-slate-800 rounded-2xl p-6 text-center animate-slide-up">
            <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Resetar {MONTHS[month - 1]}?</h3>
            <p className="text-sm text-slate-400 mb-6">
              Todas as {transactions.length} transações deste mês serão excluídas permanentemente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-700 text-sm font-medium text-slate-300 hover:bg-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetMonth}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-sm font-medium text-white hover:bg-red-600 transition-colors"
              >
                Excluir tudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Previous Month Confirmation Modal */}
      {showImportConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowImportConfirm(false)} />
          <div className="relative w-full max-w-xs mx-4 bg-slate-800 rounded-2xl p-6 text-center animate-slide-up">
            <div className="w-12 h-12 rounded-full bg-blue-500/15 flex items-center justify-center mx-auto mb-4">
              <Download className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Importar de {prevMonthName}?</h3>
            <p className="text-sm text-slate-400 mb-6">
              Transações avulsas (não recorrentes) do mês anterior serão copiadas para {MONTHS[month - 1]} com status Pendente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowImportConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-700 text-sm font-medium text-slate-300 hover:bg-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleImportPreviousMonth}
                className="flex-1 py-2.5 rounded-xl bg-blue-500 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
              >
                Importar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
