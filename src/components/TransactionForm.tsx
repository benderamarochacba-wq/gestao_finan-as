'use client';

import { useState } from 'react';
import { X, Plus, Repeat } from 'lucide-react';
import { TransactionFormData, TransactionType, TransactionStatus } from '@/types';

interface TransactionFormProps {
  onSubmit: (data: TransactionFormData) => Promise<boolean | undefined>;
  onClose: () => void;
  initialData?: Partial<TransactionFormData>;
  isEditing?: boolean;
}

export default function TransactionForm({ onSubmit, onClose, initialData, isEditing }: TransactionFormProps) {
  const [description, setDescription] = useState(initialData?.description || '');
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [type, setType] = useState<TransactionType>(initialData?.type || 'despesa_variavel');
  const [status, setStatus] = useState<TransactionStatus>(initialData?.status || 'pendente');
  const [isRecurring, setIsRecurring] = useState(initialData?.is_recurring || false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount) return;

    setSubmitting(true);
    const success = await onSubmit({
      description: description.trim(),
      amount: parseFloat(amount),
      type,
      status,
      is_recurring: isRecurring,
    });
    setSubmitting(false);

    if (success) {
      onClose();
    }
  };

  const typeOptions: { value: TransactionType; label: string; color: string }[] = [
    { value: 'receita', label: 'Receita', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    { value: 'despesa_fixa', label: 'Despesa Fixa', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    { value: 'despesa_variavel', label: 'Despesa Variável', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-800 rounded-t-3xl p-6 pb-8 safe-bottom animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">
            {isEditing ? 'Editar Transação' : 'Nova Transação'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">
              Descrição
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Salário, Aluguel, Mercado..."
              className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">
              Valor (R$)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              step="0.01"
              min="0"
              className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">
              Tipo
            </label>
            <div className="grid grid-cols-3 gap-2">
              {typeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setType(option.value)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                    type === option.value
                      ? option.color
                      : 'bg-slate-700/30 text-slate-400 border-slate-600 hover:bg-slate-700/50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">
              Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus('pendente')}
                className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                  status === 'pendente'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : 'bg-slate-700/30 text-slate-400 border-slate-600 hover:bg-slate-700/50'
                }`}
              >
                Pendente de pagamento
              </button>
              <button
                type="button"
                onClick={() => setStatus('pago')}
                className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                  status === 'pago'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-700/30 text-slate-400 border-slate-600 hover:bg-slate-700/50'
                }`}
              >
                Foi pago
              </button>
            </div>
          </div>

          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsRecurring(!isRecurring)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                isRecurring
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  : 'bg-slate-700/30 text-slate-400 border-slate-600 hover:bg-slate-700/50'
              }`}
            >
              <Repeat className="w-4 h-4" />
              <span className="text-sm font-medium">Repetir todo mês</span>
            </button>
          )}

          <button
            type="submit"
            disabled={submitting || !description.trim() || !amount}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3.5 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                {isEditing ? 'Salvar Alterações' : 'Adicionar'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
