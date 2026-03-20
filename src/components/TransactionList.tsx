'use client';

import { useState } from 'react';
import { Transaction, TransactionType, TransactionFormData, TransactionStatus } from '@/types';
import StatusBadge from './StatusBadge';
import TransactionForm from './TransactionForm';
import { Trash2, Pencil, Repeat, TrendingUp, TrendingDown, MoreVertical, Receipt } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  onToggleStatus: (id: string, currentStatus: string) => Promise<boolean>;
  onUpdate: (id: string, updates: Partial<Transaction>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
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
};

export default function TransactionList({
  transactions,
  onToggleStatus,
  onUpdate,
  onDelete,
}: TransactionListProps) {
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const grouped: Record<TransactionType, Transaction[]> = {
    receita: [],
    despesa_fixa: [],
    despesa_variavel: [],
  };

  transactions.forEach((t) => {
    grouped[t.type].push(t);
  });

  const sectionOrder: TransactionType[] = ['receita', 'despesa_fixa', 'despesa_variavel'];

  const handleEdit = async (data: TransactionFormData) => {
    if (!editingTransaction) return false;
    return onUpdate(editingTransaction.id, {
      description: data.description,
      amount: data.amount,
      type: data.type,
      status: data.status,
    });
  };

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
      <div className="space-y-6">
        {sectionOrder.map((type) => {
          const config = sectionConfig[type];
          const items = grouped[type];
          const subtotal = items.reduce((sum, t) => sum + Number(t.amount), 0);
          const Icon = config.icon;

          return (
            <section key={type}>
              {/* Section Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${config.color}`} />
                  <h3 className="text-sm font-bold text-slate-200">{config.title}</h3>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${config.badgeColor}`}>
                    {items.length}
                  </span>
                </div>
                {items.length > 0 && (
                  <span className={`text-xs font-semibold ${config.color}`}>
                    {formatCurrency(subtotal)}
                  </span>
                )}
              </div>

              {/* Transaction Cards */}
              {items.length === 0 ? (
                <div className="bg-slate-800/20 rounded-xl p-4 text-center border border-dashed border-slate-700/50">
                  <p className="text-xs text-slate-500">Nenhuma transação</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((transaction) => (
                    <div
                      key={transaction.id}
                      className={`${config.bgColor} rounded-xl p-4 border-l-[3px] ${config.borderColor} border border-slate-700/30 transition-all`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        {/* Left: description + amount */}
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

                        {/* Right: menu */}
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
            </section>
          );
        })}
      </div>

      {editingTransaction && (
        <TransactionForm
          onSubmit={handleEdit}
          onClose={() => setEditingTransaction(null)}
          initialData={{
            description: editingTransaction.description,
            amount: Number(editingTransaction.amount),
            type: editingTransaction.type,
            status: editingTransaction.status as TransactionStatus,
            is_recurring: editingTransaction.is_recurring,
          }}
          isEditing
        />
      )}
    </>
  );
}
