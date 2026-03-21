'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Transaction, TransactionFormData } from '@/types';

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
      .eq('user_id', user.id)
      .eq('month', month)
      .eq('year', year)
      .order('type', { ascending: true })
      .order('description', { ascending: true });

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
        console.warn('Tabela transactions não existe. Execute o supabase-schema.sql no SQL Editor.');
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

    // 1. Buscar IDs de grupo recorrente que JÁ existem neste mês
    const { data: existingForMonth } = await supabase
      .from('transactions')
      .select('recurring_group_id')
      .eq('user_id', user.id)
      .eq('month', month)
      .eq('year', year)
      .not('recurring_group_id', 'is', null);

    const existingGroupIds = new Set(
      (existingForMonth || []).map((t) => t.recurring_group_id)
    );

    // 2. Calcular mês anterior
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    // 3. Buscar transações recorrentes (receitas + despesas fixas) do mês anterior
    //    Estes são os tipos que devem ser herdados automaticamente
    const { data: prevRecurring } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_recurring', true)
      .eq('month', prevMonth)
      .eq('year', prevYear)
      .in('type', ['receita', 'despesa_fixa', 'reserva'])
      .not('recurring_group_id', 'is', null);

    if (!prevRecurring || prevRecurring.length === 0) return;

    // 4. Para cada transação recorrente do mês anterior que não existe neste mês,
    //    criar uma cópia com status 'pendente' (edições individuais por período)
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
      if (error) {
        console.error('Erro ao replicar recorrentes:', error);
      } else {
        await fetchTransactions();
      }
    }
  }, [month, year, supabase, fetchTransactions]);

  // Buscar transações ao trocar de mês
  useEffect(() => {
    hasReplicatedRef.current = '';
    fetchTransactions();
  }, [fetchTransactions]);

  // Replicar recorrentes após carregar as transações do mês
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
      console.error('Erro ao adicionar transação:', error);
      return false;
    }

    await fetchTransactions();
    return true;
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    const { error } = await supabase
      .from('transactions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Erro ao atualizar transação:', error);
      return false;
    }

    await fetchTransactions();
    return true;
  };

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir transação:', error);
      return false;
    }

    await fetchTransactions();
    return true;
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const status: 'pendente' | 'pago' = currentStatus === 'pendente' ? 'pago' : 'pendente';
    return updateTransaction(id, { status });
  };

  return {
    transactions,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    toggleStatus,
    refetch: fetchTransactions,
  };
}
