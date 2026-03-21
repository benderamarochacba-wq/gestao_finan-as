'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTransactions } from '@/lib/hooks/useTransactions';
import MonthSelector from '@/components/MonthSelector';
import BalanceCards from '@/components/BalanceCards';
import TransactionList from '@/components/TransactionList';
import TransactionForm from '@/components/TransactionForm';
import { Plus, LogOut, Wallet } from 'lucide-react';
import { User } from '@supabase/supabase-js';

export default function DashboardPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const router = useRouter();
  const supabase = createClient();

  const {
    transactions,
    loading,
    addTransaction,
    updateTransaction,
    updateByRecurringGroup,
    deleteTransaction,
    toggleStatus,
    makeRecurring,
    removeRecurrence,
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

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
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

            <TransactionList
              transactions={transactions}
              onToggleStatus={toggleStatus}
              onUpdate={updateTransaction}
              onUpdateBatch={updateByRecurringGroup}
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
    </div>
  );
}
