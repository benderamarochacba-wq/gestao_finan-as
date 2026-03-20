'use client';

import { Transaction } from '@/types';
import { TrendingUp, TrendingDown, Repeat, Wallet, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface BalanceCardsProps {
  transactions: Transaction[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export default function BalanceCards({ transactions }: BalanceCardsProps) {
  const receitas = transactions
    .filter((t) => t.type === 'receita')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const despesasFixas = transactions
    .filter((t) => t.type === 'despesa_fixa')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const despesasVariaveis = transactions
    .filter((t) => t.type === 'despesa_variavel')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalDespesas = despesasFixas + despesasVariaveis;
  const saldo = receitas - totalDespesas;

  return (
    <div className="space-y-3">
      {/* Saldo Total - Card principal destaque */}
      <div
        className={`relative overflow-hidden rounded-2xl p-5 border ${
          saldo >= 0
            ? 'bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 border-emerald-500/25'
            : 'bg-gradient-to-br from-red-500/15 to-red-600/5 border-red-500/25'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Wallet className={`w-5 h-5 ${saldo >= 0 ? 'text-emerald-400' : 'text-red-400'}`} />
              <span className="text-sm font-medium text-slate-300">Saldo Total</span>
            </div>
            <p className={`text-3xl font-bold tracking-tight ${saldo >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(saldo)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <ArrowUpCircle className="w-3 h-3 text-emerald-500" />
              {formatCurrency(receitas)}
            </span>
            <span className="flex items-center gap-1">
              <ArrowDownCircle className="w-3 h-3 text-red-500" />
              {formatCurrency(totalDespesas)}
            </span>
          </div>
        </div>
      </div>

      {/* Três cards: Receitas, Despesas Fixas, Despesas Variáveis */}
      <div className="grid grid-cols-3 gap-2">
        {/* Receitas */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold">Receitas</span>
          </div>
          <p className="text-base font-bold text-emerald-400">
            {formatCurrency(receitas)}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            {transactions.filter(t => t.type === 'receita').length} itens
          </p>
        </div>

        {/* Despesas Fixas */}
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Repeat className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-[10px] uppercase tracking-wider text-orange-400/70 font-semibold">Fixas</span>
          </div>
          <p className="text-base font-bold text-orange-400">
            {formatCurrency(despesasFixas)}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            {transactions.filter(t => t.type === 'despesa_fixa').length} itens
          </p>
        </div>

        {/* Despesas Variáveis */}
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingDown className="w-3.5 h-3.5 text-red-500" />
            <span className="text-[10px] uppercase tracking-wider text-red-400/70 font-semibold">Variáveis</span>
          </div>
          <p className="text-base font-bold text-red-400">
            {formatCurrency(despesasVariaveis)}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            {transactions.filter(t => t.type === 'despesa_variavel').length} itens
          </p>
        </div>
      </div>
    </div>
  );
}
