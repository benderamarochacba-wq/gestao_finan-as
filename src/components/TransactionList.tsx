'use client';

import { useCallback, useEffect, useState } from 'react';
import { Transaction, TransactionType, TransactionFormData, TransactionStatus } from '@/types';
import StatusBadge from './StatusBadge';
import TransactionForm from './TransactionForm';
import Toast from './Toast';
import { Trash2, Pencil, Repeat, TrendingUp, TrendingDown, MoreVertical, Receipt, PiggyBank, ChevronDown } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  onToggleStatus: (id: string, currentStatus: string) => Promise<boolean>;
  onUpdate: (id: string, updates: Partial<Transaction>) => Promise<boolean>;
  onUpdateBatch: (recurringGroupId: string, updates: Partial<Transaction>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onMakeRecurring: (id: string) => Promise<boolean>;
  onRemoveRecurrence: (id: string) => Promise<boolean>;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

const sectionConfig: Record<TransactionType, {
  title: string;
  icon: typeof TrendingUp;
  color: string;
  badgeColor: string;
  borderColor: string;
  bgColor: string;
}> = {
  receita: {
    title: 'Receitas',
    icon: TrendingUp,
    color: 'text-emerald-400',
    badgeColor: 'bg-emerald-500/15 text-emerald-400',
    borderColor: 'border-l-emerald-500',
    bgColor: 'bg-slate-800/40',
  },
  despesa_fixa: {
    title: 'Despesas Fixas',
    icon: Repeat,
    color: 'text-orange-400',
    badgeColor: 'bg-orange-500/15 text-orange-400',
    borderColor: 'border-l-orange-500',
    bgColor: 'bg-slate-800/40',
  },
  despesa_variavel: {
    title: 'Despesas Variáveis',
    icon: TrendingDown,
    color: 'text-red-400',
    badgeColor: 'bg-red-500/15 text-red-400',
    borderColor: 'border-l-red-500',
    bgColor: 'bg-slate-800/40',
  },
  reserva: {
    title: 'Reservas',
    icon: PiggyBank,
    color: 'text-violet-400',
    badgeColor: 'bg-violet-500/15 text-violet-400',
    borderColor: 'border-l-violet-500',
    bgColor: 'bg-slate-800/40',
  },
};

export default function TransactionList({
  transactions,
  onToggleStatus,
  onUpdate,
  onUpdateBatch,
  onDelete,
  onMakeRecurring,
  onRemoveRecurrence,
}: TransactionListProps) {
  const STORAGE_KEY_ACCORDION = 'financas_accordion_state';
  const STORAGE_KEY_SCROLL = 'financas_scroll_y';

  const defaultCollapsed: Record<string, boolean> = {
    receita: true,
    despesa_fixa: true,
    despesa_variavel: true,
    reserva: true,
  };

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(defaultCollapsed);
  const [hydrated, setHydrated] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  // Hydrate accordion state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ACCORDION);
      if (stored) {
        setCollapsed(JSON.parse(stored));
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  // Persist accordion state to localStorage on every change (after hydration)
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY_ACCORDION, JSON.stringify(collapsed));
    }
  }, [collapsed, hydrated]);

  // Restore scroll position after data loads (e.g. after fetchTransactions re-render)
  useEffect(() => {
    try {
      const savedY = localStorage.getItem(STORAGE_KEY_SCROLL);
      if (savedY) {
        const y = parseInt(savedY, 10);
        localStorage.removeItem(STORAGE_KEY_SCROLL);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => window.scrollTo(0, y));
        });
      }
    } catch { /* ignore */ }
  }, [transactions]);

  const saveScrollPosition = useCallback(() => {
    localStorage.setItem(STORAGE_KEY_SCROLL, String(window.scrollY));
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
  }, []);

  const toggleSection = useCallback((type: string) => {
    setCollapsed((prev) => ({ ...prev, [type]: !prev[type] }));
  }, []);

  const grouped: Record<TransactionType, Transaction[]> = {
    receita: [],
    despesa_fixa: [],
    despesa_variavel: [],
    reserva: [],
  };

  transactions.forEach((t) => {
    grouped[t.type].push(t);
  });

  const sectionOrder: TransactionType[] = ['receita', 'despesa_fixa', 'despesa_variavel', 'reserva'];

  const handleEdit = useCallback(async (data: TransactionFormData) => {
    if (!editingTransaction) return false;

    const wasRecurring = editingTransaction.is_recurring;
    const nowRecurring = data.is_recurring;
    const fieldUpdates: Partial<Transaction> = {
      description: data.description,
      amount: data.amount,
      type: data.type,
      status: data.status,
    };

    let ok: boolean;

    if (nowRecurring && editingTransaction.recurring_group_id) {
      // Recurrence ON + has group: batch update all records in the series
      ok = await onUpdateBatch(editingTransaction.recurring_group_id, fieldUpdates);
    } else {
      // Recurrence OFF or no group: update only this single record by UUID
      ok = await onUpdate(editingTransaction.id, fieldUpdates);
    }

    if (!ok) return false;

    // Handle recurrence toggle changes
    if (!wasRecurring && nowRecurring) {
      await onMakeRecurring(editingTransaction.id);
    } else if (wasRecurring && !nowRecurring) {
      await onRemoveRecurrence(editingTransaction.id);
    }

    return true;
  }, [editingTransaction, onUpdate, onUpdateBatch, onMakeRecurring, onRemoveRecurrence]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
    setActiveMenu(null);
  };

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Receipt className="w-12 h-12 text-slate-600 mb-4" />
        <p className="text-slate-400 font-medium mb-1">Nenhuma transação neste mês</p>
        <p className="text-sm text-slate-500">Toque no botão + para adicionar</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {sectionOrder.map((type) => {
          const config = sectionConfig[type];
          const items = grouped[type];
          const subtotal = items.reduce((sum, t) => sum + Number(t.amount), 0);
          const Icon = config.icon;
          const isCollapsed = collapsed[type] ?? true;

          return (
            <section key={type}>
              {/* Accordion Header — clickable */}
              <button
                onClick={() => toggleSection(type)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${config.color}`} />
                  <h3 className="text-sm font-bold text-slate-200">{config.title}</h3>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${config.badgeColor}`}>
                    {items.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {items.length > 0 && (
                    <span className={`text-xs font-semibold ${config.color}`}>
                      {formatCurrency(subtotal)}
                    </span>
                  )}
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                </div>
              </button>

              {/* Collapsible Content */}
              {!isCollapsed && (
                <div className="mt-2">
                  {items.length === 0 ? (
                    <div className="bg-slate-800/20 rounded-xl p-4 text-center border border-dashed border-slate-700/50">
                      <p className="text-xs text-slate-500">Nenhuma transação</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {items.map((transaction) => (
                        <div
                          key={transaction.id}
                          id={`tx-${transaction.id}`}
                          className={`${config.bgColor} rounded-xl p-4 border-l-[3px] ${config.borderColor} border border-slate-700/30 transition-all`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                <p className="text-sm font-medium text-white truncate">
                                  {transaction.description}
                                </p>
                                {transaction.is_recurring && (
                                  <span className="flex items-center gap-0.5 text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-md font-medium flex-shrink-0">
                                    <Repeat className="w-2.5 h-2.5" />
                                    Mensal
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <p className={`text-lg font-bold ${config.color}`}>
                                  {type === 'receita' ? '+' : '-'}{' '}
                                  {formatCurrency(Number(transaction.amount))}
                                </p>
                                <StatusBadge
                                  status={transaction.status as TransactionStatus}
                                  onToggle={() => onToggleStatus(transaction.id, transaction.status)}
                                />
                              </div>
                            </div>

                            <div className="relative flex-shrink-0">
                              <button
                                onClick={() =>
                                  setActiveMenu(activeMenu === transaction.id ? null : transaction.id)
                                }
                                className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
                              >
                                <MoreVertical className="w-4 h-4 text-slate-500" />
                              </button>
                              {activeMenu === transaction.id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setActiveMenu(null)}
                                  />
                                  <div className="absolute right-0 top-full mt-1 z-20 bg-slate-700 rounded-xl shadow-2xl border border-slate-600 overflow-hidden min-w-[150px] animate-fade-in">
                                    <button
                                      onClick={() => {
                                        saveScrollPosition();
                                        setEditingTransaction(transaction);
                                        setActiveMenu(null);
                                      }}
                                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-200 hover:bg-slate-600 transition-colors"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                      Editar
                                    </button>
                                    <button
                                      onClick={() => handleDelete(transaction.id)}
                                      disabled={deletingId === transaction.id}
                                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-400 hover:bg-slate-600 transition-colors border-t border-slate-600/50"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      {deletingId === transaction.id ? 'Excluindo...' : 'Excluir'}
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {editingTransaction && (
        <TransactionForm
          onSubmit={async (data) => {
            const isBatch = data.is_recurring && !!editingTransaction.recurring_group_id;

            // Force-expand the edited section, save to localStorage for scroll restoration
            setCollapsed((prev) => ({ ...prev, [editingTransaction.type]: false }));
            saveScrollPosition();

            const result = await handleEdit(data);
            setEditingTransaction(null);

            if (result) {
              showToast(isBatch ? 'Série atualizada com sucesso' : 'Transação salva com sucesso');
            }
            return result;
          }}
          onClose={() => {
            // Scroll is already in localStorage, will be restored by the transactions useEffect
            saveScrollPosition();
            setEditingTransaction(null);
          }}
          initialData={{
            description: editingTransaction.description,
            amount: Number(editingTransaction.amount),
            type: editingTransaction.type,
            status: editingTransaction.status as TransactionStatus,
            is_recurring: editingTransaction.is_recurring,
          }}
          isEditing
          showRecurrenceToggle
        />
      )}

      <Toast
        message={toastMsg}
        visible={toastVisible}
        onDone={() => setToastVisible(false)}
      />
    </>
  );
}
