'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Transaction, TransactionFormData } from '@/types';
import { showToast } from '@/components/Toast';

export function useTransactions(month: number, year: number) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const hasReplicatedRef = useRef<string>('');

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('month', month)
      .eq('year', year)
      .order('type', { ascending: true })
      .order('description', { ascending: true });

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
        console.warn('Tabela transactions não existe.');
      } else if (error.message?.includes('fetch') || error.message?.includes('network')) {
        showToast('Sem conexão com o servidor', 'error');
      } else {
        console.error('Erro ao buscar transações:', error);
      }
      setTransactions([]);
      setLoading(false);
      return;
    }

    setTransactions(data || []);
    setLoading(false);
  }, [month, year, supabase]);

  const replicateRecurring = useCallback(async () => {
    const monthKey = `${year}-${month}`;
    if (hasReplicatedRef.current === monthKey) return;
    hasReplicatedRef.current = monthKey;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: existingForMonth } = await supabase
      .from('transactions')
      .select('recurring_group_id')
      .eq('month', month)
      .eq('year', year)
      .not('recurring_group_id', 'is', null);

    const existingGroupIds = new Set(
      (existingForMonth || []).map((t) => t.recurring_group_id)
    );

    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    const { data: prevRecurring } = await supabase
      .from('transactions')
      .select('*')
      .eq('is_recurring', true)
      .eq('month', prevMonth)
      .eq('year', prevYear)
      .not('recurring_group_id', 'is', null);

    if (!prevRecurring || prevRecurring.length === 0) return;

    const toInsert: Record<string, unknown>[] = [];
    for (const template of prevRecurring) {
      if (!template.recurring_group_id) continue;
      if (existingGroupIds.has(template.recurring_group_id)) continue;

      toInsert.push({
        user_id: user.id,
        description: template.description,
        amount: template.amount,
        type: template.type,
        status: 'pendente',
        is_recurring: true,
        recurring_group_id: template.recurring_group_id,
        month,
        year,
      });
    }

    if (toInsert.length > 0) {
      const { error } = await supabase.from('transactions').insert(toInsert);
      if (!error) {
        await fetchTransactions();
      }
    }
  }, [month, year, supabase, fetchTransactions]);

  useEffect(() => {
    hasReplicatedRef.current = '';
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    if (!loading) {
      replicateRecurring();
    }
  }, [loading, replicateRecurring]);

  const addTransaction = async (formData: TransactionFormData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const recurringGroupId = formData.is_recurring ? crypto.randomUUID() : null;

    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      description: formData.description,
      amount: formData.amount,
      type: formData.type,
      status: formData.status,
      is_recurring: formData.is_recurring,
      recurring_group_id: recurringGroupId,
      month,
      year,
    });

    if (error) {
      showToast('Erro ao adicionar transação', 'error');
      return false;
    }

    await fetchTransactions();
    showToast('Transação adicionada');
    return true;
  };

  // Optimistic update: patch local state immediately, then persist to DB
  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    // 1. Optimistic: update local cache instantly
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t))
    );

    // 2. Persist to Supabase
    const { error } = await supabase
      .from('transactions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      showToast('Sem conexão — alteração não salva', 'error');
      await fetchTransactions();
      return false;
    }

    showToast('Alteração salva');
    return true;
  };

  // Optimistic delete: remove from local state immediately
  const deleteTransaction = async (id: string) => {
    const backup = transactions;
    setTransactions((prev) => prev.filter((t) => t.id !== id));

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) {
      showToast('Erro ao excluir', 'error');
      setTransactions(backup);
      return false;
    }

    showToast('Transação excluída');
    return true;
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const status: 'pendente' | 'pago' = currentStatus === 'pendente' ? 'pago' : 'pendente';
    return updateTransaction(id, { status });
  };

  const makeRecurring = async (id: string) => {
    return updateTransaction(id, {
      is_recurring: true,
      recurring_group_id: crypto.randomUUID(),
    });
  };

  const removeRecurrence = async (id: string) => {
    return updateTransaction(id, {
      is_recurring: false,
      recurring_group_id: null,
    });
  };

  // Batch: delete all transactions for this month
  const resetMonth = async () => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('month', month)
      .eq('year', year);

    if (error) {
      showToast('Erro ao resetar mês', 'error');
      return false;
    }

    setTransactions([]);
    showToast('Mês resetado com sucesso');
    return true;
  };

  // Batch: clone non-recurring from previous month
  const importPreviousMonth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    const { data: prevTransactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('month', prevMonth)
      .eq('year', prevYear)
      .eq('is_recurring', false);

    if (!prevTransactions || prevTransactions.length === 0) {
      showToast('Nenhuma transação avulsa no mês anterior', 'warning');
      return false;
    }

    const toInsert = prevTransactions.map((t) => ({
      user_id: user.id,
      description: t.description,
      amount: t.amount,
      type: t.type,
      status: 'pendente' as const,
      is_recurring: false,
      recurring_group_id: null,
      month,
      year,
    }));

    const { error } = await supabase.from('transactions').insert(toInsert);

    if (error) {
      showToast('Erro ao importar mês anterior', 'error');
      return false;
    }

    await fetchTransactions();
    showToast(`${toInsert.length} transações importadas`);
    return true;
  };

  return {
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
    refetch: fetchTransactions,
  };
}
