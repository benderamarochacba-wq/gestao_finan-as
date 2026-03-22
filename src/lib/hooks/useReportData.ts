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
  totalGastos: number;
  saldo: number;
  savingsRate: number;
  patrimonio: number;
  reservasAcumuladas: number;
  danielGastos: number;
  vanessaGastos: number;
  outrosGastos: number;
  topCategories: { description: string; amount: number; type: string }[];
}

export interface ReportData {
  months: MonthlyAggregate[];
  loading: boolean;
  totalReceitas: number;
  totalDespesas: number;
  totalReservasAcumuladas: number;
  avgSavingsRate: number;
  reserveGrowth: number;
  bestMonth: MonthlyAggregate | null;
  worstMonth: MonthlyAggregate | null;
}

const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const DANIEL_KEYWORDS = ['daniel', 'cartão daniel', 'cartao daniel', 'card daniel'];
const VANESSA_KEYWORDS = ['vanessa', 'cartão vanessa', 'cartao vanessa', 'card vanessa'];

function matchOwner(description: string): 'daniel' | 'vanessa' | 'outros' {
  const lower = description.toLowerCase();
  if (DANIEL_KEYWORDS.some(k => lower.includes(k))) return 'daniel';
  if (VANESSA_KEYWORDS.some(k => lower.includes(k))) return 'vanessa';
  return 'outros';
}

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

    let reservasAcumuladas = 0;
    let saldoAcumulado = 0;
    const aggregates: MonthlyAggregate[] = [];

    for (const [, txs] of Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b))) {
      const first = txs[0];
      const receitas = txs.filter(t => t.type === 'receita').reduce((s, t) => s + Number(t.amount), 0);
      const despesasFixas = txs.filter(t => t.type === 'despesa_fixa').reduce((s, t) => s + Number(t.amount), 0);
      const despesasVariaveis = txs.filter(t => t.type === 'despesa_variavel').reduce((s, t) => s + Number(t.amount), 0);
      const reservas = txs.filter(t => t.type === 'reserva').reduce((s, t) => s + Number(t.amount), 0);
      const reservasPagas = txs.filter(t => t.type === 'reserva' && t.status === 'pago').reduce((s, t) => s + Number(t.amount), 0);

      const totalGastos = despesasFixas + despesasVariaveis;
      const saldo = receitas - totalGastos - reservasPagas;
      const savingsRate = receitas > 0 ? ((reservasPagas + saldo) / receitas) * 100 : 0;

      reservasAcumuladas += reservasPagas;
      saldoAcumulado += saldo;

      // Card split: only count expenses (not receitas/reservas)
      const expenses = txs.filter(t => t.type === 'despesa_fixa' || t.type === 'despesa_variavel');
      let danielGastos = 0, vanessaGastos = 0, outrosGastos = 0;
      for (const e of expenses) {
        const owner = matchOwner(e.description);
        const amt = Number(e.amount);
        if (owner === 'daniel') danielGastos += amt;
        else if (owner === 'vanessa') vanessaGastos += amt;
        else outrosGastos += amt;
      }

      // Top categories: top 5 expenses by amount
      const allExpenses = txs
        .filter(t => t.type !== 'receita')
        .sort((a, b) => Number(b.amount) - Number(a.amount))
        .slice(0, 5)
        .map(t => ({ description: t.description, amount: Number(t.amount), type: t.type }));

      aggregates.push({
        label: `${MONTH_NAMES[first.month - 1]}/${first.year}`,
        month: first.month,
        year: first.year,
        receitas,
        despesasFixas,
        despesasVariaveis,
        reservas,
        reservasPagas,
        totalGastos,
        saldo,
        savingsRate,
        patrimonio: saldoAcumulado + reservasAcumuladas,
        reservasAcumuladas,
        danielGastos,
        vanessaGastos,
        outrosGastos,
        topCategories: allExpenses,
      });
    }

    setMonths(aggregates);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const totalReceitas = months.reduce((s, m) => s + m.receitas, 0);
  const totalDespesas = months.reduce((s, m) => s + m.totalGastos + m.reservasPagas, 0);
  const totalReservasAcumuladas = months.length > 0 ? months[months.length - 1].reservasAcumuladas : 0;
  const avgSavingsRate = months.length > 0
    ? months.reduce((s, m) => s + m.savingsRate, 0) / months.length
    : 0;
  const reserveGrowth = months.length >= 2
    ? months[months.length - 1].reservasPagas - months[0].reservasPagas
    : 0;
  const bestMonth = months.length > 0 ? months.reduce((best, m) => m.savingsRate > best.savingsRate ? m : best) : null;
  const worstMonth = months.length > 0 ? months.reduce((worst, m) => m.savingsRate < worst.savingsRate ? m : worst) : null;

  return {
    months,
    loading,
    totalReceitas,
    totalDespesas,
    totalReservasAcumuladas,
    avgSavingsRate,
    reserveGrowth,
    bestMonth,
    worstMonth,
  };
}
