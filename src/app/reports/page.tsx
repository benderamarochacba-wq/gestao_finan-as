'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useReportData, MonthlyAggregate } from '@/lib/hooks/useReportData';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend, Area, AreaChart,
} from 'recharts';
import {
  ArrowLeft, TrendingUp, TrendingDown, PiggyBank, Target,
  ShieldCheck, AlertTriangle, Lightbulb, Wallet, Users, Crown,
} from 'lucide-react';

function fmt(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function fmtCompact(v: number): string {
  if (Math.abs(v) >= 1000) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v);
  }
  return fmt(v);
}

function CTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload) return null;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 shadow-xl text-xs">
      <p className="font-bold text-slate-200 mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-semibold text-slate-200">{typeof p.value === 'number' && p.name.includes('%') ? `${p.value}%` : fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function HealthBadge({ rate }: { rate: number }) {
  if (rate >= 20) return (<div className="flex items-center gap-1.5 text-emerald-400"><ShieldCheck className="w-4 h-4" /><span className="text-xs font-bold">Excelente</span></div>);
  if (rate >= 10) return (<div className="flex items-center gap-1.5 text-amber-400"><Target className="w-4 h-4" /><span className="text-xs font-bold">Moderada</span></div>);
  return (<div className="flex items-center gap-1.5 text-red-400"><AlertTriangle className="w-4 h-4" /><span className="text-xs font-bold">Atenção</span></div>);
}

const TYPE_COLORS: Record<string, string> = {
  despesa_fixa: 'text-orange-400',
  despesa_variavel: 'text-red-400',
  reserva: 'text-violet-400',
};

function generateSuggestions(months: MonthlyAggregate[]): string[] {
  if (months.length === 0) return [];
  const tips: string[] = [];
  const last = months[months.length - 1];
  const avg = months.reduce((s, m) => s + m.savingsRate, 0) / months.length;

  if (avg < 10) tips.push('Taxa de economia abaixo de 10%. Reduza despesas variáveis em pelo menos 15% no próximo mês.');
  if (last.despesasVariaveis > last.despesasFixas) tips.push('Despesas variáveis superaram as fixas. Revise gastos com alimentação, transporte e lazer.');
  if (last.reservasPagas === 0 && last.receitas > 0) tips.push('Nenhuma reserva este mês. Destine ao menos 10% da renda para a reserva de emergência.');
  if (months.length >= 2) {
    const prev = months[months.length - 2];
    if (prev.despesasVariaveis > 0 && last.despesasVariaveis > prev.despesasVariaveis * 1.2) {
      tips.push(`Variáveis subiram ${Math.round(((last.despesasVariaveis / prev.despesasVariaveis) - 1) * 100)}% vs mês anterior.`);
    }
  }
  if (last.danielGastos > 0 && last.vanessaGastos > 0) {
    const ratio = last.danielGastos / (last.danielGastos + last.vanessaGastos) * 100;
    if (ratio > 65) tips.push(`Cartão Daniel representa ${ratio.toFixed(0)}% dos gastos. Reequilibrem a divisão.`);
    else if (ratio < 35) tips.push(`Cartão Vanessa representa ${(100 - ratio).toFixed(0)}% dos gastos. Reequilibrem a divisão.`);
  }
  if (avg >= 20) tips.push('Excelente! Considere diversificar suas reservas em investimentos de renda fixa.');
  if (tips.length === 0) tips.push('Continue monitorando suas finanças mensalmente para manter o controle do orçamento familiar.');
  return tips;
}

export default function ReportsPage() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();
  const supabase = createClient();
  const report = useReportData();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.replace('/login');
      else setCheckingAuth(false);
    });
  }, [router, supabase]);

  if (checkingAuth || report.loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400" />
      </div>
    );
  }

  const suggestions = generateSuggestions(report.months);

  const flowData = report.months.map(m => ({
    name: m.label,
    Receitas: m.receitas,
    Fixas: m.despesasFixas,
    'Variáveis': m.despesasVariaveis,
    Reservas: m.reservasPagas,
  }));

  const patrimonioData = report.months.map(m => ({
    name: m.label,
    'Saldo Corrente': m.patrimonio - m.reservasAcumuladas,
    'Reservas Acum.': m.reservasAcumuladas,
    Patrimônio: m.patrimonio,
  }));

  const economiaData = report.months.map(m => ({
    name: m.label,
    'Economia (%)': Math.round(m.savingsRate),
  }));

  const hasCardData = report.months.some(m => m.danielGastos > 0 || m.vanessaGastos > 0);
  const cardData = report.months.map(m => ({
    name: m.label,
    Daniel: m.danielGastos,
    Vanessa: m.vanessaGastos,
    Compartilhado: m.outrosGastos,
  }));

  const lastMonth = report.months.length > 0 ? report.months[report.months.length - 1] : null;

  return (
    <div className="min-h-screen bg-slate-900 pb-12">
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-30 safe-top">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="p-2 rounded-xl hover:bg-slate-700/50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <h1 className="text-base font-bold text-white">Relatório da Família</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {report.months.length === 0 ? (
          <div className="text-center py-20">
            <Wallet className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">Nenhuma transação cadastrada ainda</p>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-slate-800/50 border border-slate-700/30 rounded-2xl p-3.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Receitas</span>
                </div>
                <p className="text-base font-bold text-emerald-400 truncate">{fmtCompact(report.totalReceitas)}</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/30 rounded-2xl p-3.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Despesas</span>
                </div>
                <p className="text-base font-bold text-red-400 truncate">{fmtCompact(report.totalDespesas)}</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/30 rounded-2xl p-3.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <PiggyBank className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Reservas Acum.</span>
                </div>
                <p className="text-base font-bold text-violet-400 truncate">{fmtCompact(report.totalReservasAcumuladas)}</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/30 rounded-2xl p-3.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Target className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Economia</span>
                </div>
                <p className="text-base font-bold text-amber-400">{report.avgSavingsRate.toFixed(1)}%</p>
                <HealthBadge rate={report.avgSavingsRate} />
              </div>
            </div>

            {/* Chart 1: Fluxo de Caixa */}
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-4">
              <h2 className="text-sm font-bold text-slate-200 mb-3">Fluxo de Caixa Mensal</h2>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={flowData} barGap={1} barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} tickFormatter={fmtCompact} />
                    <Tooltip content={<CTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 9 }} />
                    <Bar dataKey="Receitas" fill="#10b981" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Fixas" fill="#f97316" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Variáveis" fill="#ef4444" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Reservas" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Evolução do Patrimônio */}
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-200">Evolução do Patrimônio</h2>
                {lastMonth && (
                  <span className="text-xs font-bold text-emerald-400">{fmtCompact(lastMonth.patrimonio)}</span>
                )}
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={patrimonioData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} tickFormatter={fmtCompact} />
                    <Tooltip content={<CTooltip />} />
                    <Area type="monotone" dataKey="Reservas Acum." stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} strokeWidth={2} />
                    <Area type="monotone" dataKey="Saldo Corrente" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">Patrimônio = Saldo Corrente Acumulado + Reservas Pagas Acumuladas</p>
            </div>

            {/* Chart 3: Cartão Daniel vs Vanessa */}
            {hasCardData && (
              <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-sky-400" />
                  <h2 className="text-sm font-bold text-slate-200">Gastos por Cartão</h2>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cardData} barGap={1} barSize={18}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} tickFormatter={fmtCompact} />
                      <Tooltip content={<CTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 9 }} />
                      <Bar dataKey="Daniel" fill="#38bdf8" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Vanessa" fill="#f472b6" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Compartilhado" fill="#64748b" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">Inclua &quot;Daniel&quot; ou &quot;Vanessa&quot; na descrição da despesa para categorizar.</p>
              </div>
            )}

            {/* Chart 4: Taxa de Economia */}
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-4">
              <h2 className="text-sm font-bold text-slate-200 mb-3">Taxa de Economia (%)</h2>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={economiaData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} />
                    <Tooltip content={<CTooltip />} />
                    <Line type="monotone" dataKey="Economia (%)" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
                <span>Meta: acima de 20%</span>
                <span className="font-semibold">Média: {report.avgSavingsRate.toFixed(1)}%</span>
              </div>
            </div>

            {/* Top Categories per last month */}
            {lastMonth && lastMonth.topCategories.length > 0 && (
              <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-bold text-slate-200">Top Gastos — {lastMonth.label}</h2>
                </div>
                <div className="space-y-2">
                  {lastMonth.topCategories.map((cat, i) => {
                    const maxAmount = lastMonth.topCategories[0].amount;
                    const widthPct = maxAmount > 0 ? (cat.amount / maxAmount) * 100 : 0;
                    const color = TYPE_COLORS[cat.type] || 'text-slate-400';
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-200 truncate mr-2">{cat.description}</span>
                          <span className={`font-semibold flex-shrink-0 ${color}`}>{fmtCompact(cat.amount)}</span>
                        </div>
                        <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${cat.type === 'despesa_fixa' ? 'bg-orange-500' : cat.type === 'despesa_variavel' ? 'bg-red-500' : 'bg-violet-500'}`}
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Best/Worst */}
            {report.bestMonth && report.worstMonth && report.months.length >= 2 && (
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3.5">
                  <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-1">Melhor Mês</p>
                  <p className="text-sm font-bold text-emerald-400">{report.bestMonth.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{report.bestMonth.savingsRate.toFixed(1)}% economia</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3.5">
                  <p className="text-[10px] uppercase tracking-wider text-red-400/70 font-semibold mb-1">Mês Crítico</p>
                  <p className="text-sm font-bold text-red-400">{report.worstMonth.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{report.worstMonth.savingsRate.toFixed(1)}% economia</p>
                </div>
              </div>
            )}

            {/* Suggestions */}
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold text-slate-200">Insights para o Casal</h2>
              </div>
              <div className="space-y-2">
                {suggestions.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="w-4 h-4 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center flex-shrink-0 text-[9px] font-bold mt-0.5">
                      {i + 1}
                    </span>
                    <p className="leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Comparison Table */}
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-4">
              <h2 className="text-sm font-bold text-slate-200 mb-2">Mês a Mês</h2>
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-700/50">
                      <th className="text-left py-1.5 pr-1">Mês</th>
                      <th className="text-right py-1.5 px-1">Receita</th>
                      <th className="text-right py-1.5 px-1">Despesa</th>
                      <th className="text-right py-1.5 px-1">Reserva</th>
                      <th className="text-right py-1.5 pl-1">Patrim.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.months.map((m) => (
                      <tr key={m.label} className="border-b border-slate-800/30">
                        <td className="py-2 pr-1 font-medium text-slate-300">{m.label}</td>
                        <td className="py-2 px-1 text-right text-emerald-400">{fmtCompact(m.receitas)}</td>
                        <td className="py-2 px-1 text-right text-red-400">{fmtCompact(m.totalGastos)}</td>
                        <td className="py-2 px-1 text-right text-violet-400">{fmtCompact(m.reservasPagas)}</td>
                        <td className="py-2 pl-1 text-right font-semibold text-slate-200">{fmtCompact(m.patrimonio)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
