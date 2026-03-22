'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Transaction } from '@/types';

export interface MonthlyAggregate {
  label: string;
  month: number;
  year: number;
  receitas: number;
  despesasFixas: number;
  despesasVariaveis: number;
  reservas: number;
  reservasPagas: number;
  total: number;
  saldo: number;
  savingsRate: number;
}

export interface ReportData {
  months: MonthlyAggregate[];
  loading: boolean;
  totalReceitas: number;
  totalDespesas: number;
  totalReservas: number;
  avgSavingsRate: number;
  reserveGrowth: number;
  bestMonth: MonthlyAggregate | null;
  worstMonth: MonthlyAggregate | null;
}

const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

export function useReportData(): ReportData {
  const [months, setMonths] = useState<MonthlyAggregate[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('year', { ascending: true })
      .order('month', { ascending: true });

    if (error || !data) {
      console.error('Erro ao buscar relatório:', error);
      setLoading(false);
      return;
    }

    const grouped = new Map<string, Transaction[]>();
    for (const t of data) {
      const key = `${t.year}-${String(t.month).padStart(2, '0')}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(t);
    }

    const aggregates: MonthlyAggregate[] = [];
    for (const [, txs] of Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b))) {
      const first = txs[0];
      const receitas = txs.filter(t => t.type === 'receita').reduce((s, t) => s + Number(t.amount), 0);
      const despesasFixas = txs.filter(t => t.type === 'despesa_fixa').reduce((s, t) => s + Number(t.amount), 0);
      const despesasVariaveis = txs.filter(t => t.type === 'despesa_variavel').reduce((s, t) => s + Number(t.amount), 0);
      const reservas = txs.filter(t => t.type === 'reserva').reduce((s, t) => s + Number(t.amount), 0);
      const reservasPagas = txs.filter(t => t.type === 'reserva' && t.status === 'pago').reduce((s, t) => s + Number(t.amount), 0);
      const total = despesasFixas + despesasVariaveis + reservasPagas;
      const saldo = receitas - total;
      const savingsRate = receitas > 0 ? ((receitas - total) / receitas) * 100 : 0;

      aggregates.push({
        label: `${MONTH_NAMES[first.month - 1]}/${first.year}`,
        month: first.month,
        year: first.year,
        receitas,
        despesasFixas,
        despesasVariaveis,
        reservas,
        reservasPagas,
        total,
        saldo,
        savingsRate,
      });
    }

    setMonths(aggregates);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const totalReceitas = months.reduce((s, m) => s + m.receitas, 0);
  const totalDespesas = months.reduce((s, m) => s + m.total, 0);
  const totalReservas = months.reduce((s, m) => s + m.reservasPagas, 0);
  const avgSavingsRate = months.length > 0
    ? months.reduce((s, m) => s + m.savingsRate, 0) / months.length
    : 0;

  const reserveValues = months.map(m => m.reservasPagas);
  const reserveGrowth = reserveValues.length >= 2
    ? reserveValues[reserveValues.length - 1] - reserveValues[0]
    : 0;

  const bestMonth = months.length > 0 ? months.reduce((best, m) => m.savingsRate > best.savingsRate ? m : best) : null;
  const worstMonth = months.length > 0 ? months.reduce((worst, m) => m.savingsRate < worst.savingsRate ? m : worst) : null;

  return {
    months,
    loading,
    totalReceitas,
    totalDespesas,
    totalReservas,
    avgSavingsRate,
    reserveGrowth,
    bestMonth,
    worstMonth,
  };
}
