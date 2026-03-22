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
  ShieldCheck, AlertTriangle, Lightbulb, Wallet,
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

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload) return null;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 shadow-xl text-xs">
      <p className="font-bold text-slate-200 mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-semibold text-slate-200">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function HealthBadge({ rate }: { rate: number }) {
  if (rate >= 20) return (
    <div className="flex items-center gap-2 text-emerald-400">
      <ShieldCheck className="w-5 h-5" />
      <span className="text-sm font-bold">Excelente</span>
    </div>
  );
  if (rate >= 10) return (
    <div className="flex items-center gap-2 text-amber-400">
      <Target className="w-5 h-5" />
      <span className="text-sm font-bold">Moderada</span>
    </div>
  );
  return (
    <div className="flex items-center gap-2 text-red-400">
      <AlertTriangle className="w-5 h-5" />
      <span className="text-sm font-bold">Atenção</span>
    </div>
  );
}

function generateSuggestions(months: MonthlyAggregate[]): string[] {
  if (months.length === 0) return [];
  const tips: string[] = [];
  const last = months[months.length - 1];
  const avg = months.reduce((s, m) => s + m.savingsRate, 0) / months.length;

  if (avg < 10) {
    tips.push('Sua taxa de economia está abaixo de 10%. Tente reduzir despesas variáveis em pelo menos 15% no próximo mês.');
  }
  if (last.despesasVariaveis > last.despesasFixas) {
    tips.push('Despesas variáveis superaram as fixas este mês. Revise gastos com alimentação fora, transporte e lazer.');
  }
  if (last.reservasPagas === 0 && last.receitas > 0) {
    tips.push('Nenhuma reserva foi feita este mês. Destine ao menos 10% da renda para sua reserva de emergência.');
  }
  if (months.length >= 2) {
    const prev = months[months.length - 2];
    if (last.despesasVariaveis > prev.despesasVariaveis * 1.2) {
      tips.push(`Despesas variáveis aumentaram ${Math.round(((last.despesasVariaveis / prev.despesasVariaveis) - 1) * 100)}% em relação ao mês anterior.`);
    }
    if (last.saldo < prev.saldo) {
      tips.push('Seu saldo diminuiu em relação ao mês anterior. Avalie quais categorias cresceram.');
    }
  }
  if (avg >= 20) {
    tips.push('Parabéns! Sua taxa de economia está excelente. Considere diversificar suas reservas em investimentos.');
  }
  if (tips.length === 0) {
    tips.push('Continue monitorando suas finanças mensalmente para manter o controle do orçamento familiar.');
  }
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
  const chartData = report.months.map(m => ({
    name: m.label,
    Receitas: m.receitas,
    Fixas: m.despesasFixas,
    Variáveis: m.despesasVariaveis,
    Reservas: m.reservasPagas,
    Saldo: m.saldo,
    'Taxa Economia (%)': Math.round(m.savingsRate),
  }));

  return (
    <div className="min-h-screen bg-slate-900 pb-12">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-30 safe-top">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 rounded-xl hover:bg-slate-700/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <h1 className="text-base font-bold text-white">Relatórios Financeiros</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {report.months.length === 0 ? (
          <div className="text-center py-20">
            <Wallet className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">Nenhuma transação cadastrada ainda</p>
            <p className="text-sm text-slate-500 mt-1">Adicione transações no Dashboard para gerar relatórios</p>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/50 border border-slate-700/30 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Total Receitas</span>
                </div>
                <p className="text-lg font-bold text-emerald-400">{fmtCompact(report.totalReceitas)}</p>
                <p className="text-[10px] text-slate-500 mt-1">{report.months.length} meses</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/30 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Total Despesas</span>
                </div>
                <p className="text-lg font-bold text-red-400">{fmtCompact(report.totalDespesas)}</p>
                <p className="text-[10px] text-slate-500 mt-1">Fixas + Variáveis + Reservas</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/30 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <PiggyBank className="w-4 h-4 text-violet-400" />
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Total Reservas</span>
                </div>
                <p className="text-lg font-bold text-violet-400">{fmtCompact(report.totalReservas)}</p>
                <p className={`text-[10px] mt-1 ${report.reserveGrowth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {report.reserveGrowth >= 0 ? '↑' : '↓'} {fmtCompact(Math.abs(report.reserveGrowth))} crescimento
                </p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/30 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-amber-400" />
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Economia Média</span>
                </div>
                <p className="text-lg font-bold text-amber-400">{report.avgSavingsRate.toFixed(1)}%</p>
                <HealthBadge rate={report.avgSavingsRate} />
              </div>
            </div>

            {/* Chart 1: Receitas vs Despesas por mês */}
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-4">
              <h2 className="text-sm font-bold text-slate-200 mb-4">Receitas vs Despesas por Mês</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v) => fmtCompact(v)} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 10, color: '#94a3b8' }} />
                    <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Fixas" fill="#f97316" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Variáveis" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Reservas" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Evolução do Saldo */}
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-4">
              <h2 className="text-sm font-bold text-slate-200 mb-4">Evolução do Saldo Mensal</h2>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v) => fmtCompact(v)} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="Saldo" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Taxa de Economia */}
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-4">
              <h2 className="text-sm font-bold text-slate-200 mb-4">Taxa de Economia Mensal (%)</h2>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} domain={['auto', 'auto']} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="Taxa Economia (%)" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
                <span>Meta ideal: acima de 20%</span>
                <span className="font-semibold">Média: {report.avgSavingsRate.toFixed(1)}%</span>
              </div>
            </div>

            {/* Month-to-Month comparison table */}
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-4">
              <h2 className="text-sm font-bold text-slate-200 mb-3">Comparativo Mês a Mês</h2>
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-700/50">
                      <th className="text-left py-2 pr-2 font-medium">Mês</th>
                      <th className="text-right py-2 px-1 font-medium">Receitas</th>
                      <th className="text-right py-2 px-1 font-medium">Despesas</th>
                      <th className="text-right py-2 px-1 font-medium">Saldo</th>
                      <th className="text-right py-2 pl-1 font-medium">Econ.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.months.map((m, i) => {
                      const prev = i > 0 ? report.months[i - 1] : null;
                      const saldoDiff = prev ? m.saldo - prev.saldo : 0;
                      return (
                        <tr key={m.label} className="border-b border-slate-800/50">
                          <td className="py-2.5 pr-2 font-medium text-slate-200">{m.label}</td>
                          <td className="py-2.5 px-1 text-right text-emerald-400">{fmtCompact(m.receitas)}</td>
                          <td className="py-2.5 px-1 text-right text-red-400">{fmtCompact(m.total)}</td>
                          <td className="py-2.5 px-1 text-right">
                            <span className={m.saldo >= 0 ? 'text-emerald-400' : 'text-red-400'}>{fmtCompact(m.saldo)}</span>
                            {prev && (
                              <span className={`ml-1 text-[9px] ${saldoDiff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {saldoDiff >= 0 ? '↑' : '↓'}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 pl-1 text-right">
                            <span className={`font-semibold ${m.savingsRate >= 20 ? 'text-emerald-400' : m.savingsRate >= 10 ? 'text-amber-400' : 'text-red-400'}`}>
                              {m.savingsRate.toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Best/Worst month */}
            {report.bestMonth && report.worstMonth && report.months.length >= 2 && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
                  <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-1">Melhor Mês</p>
                  <p className="text-sm font-bold text-emerald-400">{report.bestMonth.label}</p>
                  <p className="text-xs text-slate-400 mt-1">Economia de {report.bestMonth.savingsRate.toFixed(1)}%</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
                  <p className="text-[10px] uppercase tracking-wider text-red-400/70 font-semibold mb-1">Mês Crítico</p>
                  <p className="text-sm font-bold text-red-400">{report.worstMonth.label}</p>
                  <p className="text-xs text-slate-400 mt-1">Economia de {report.worstMonth.savingsRate.toFixed(1)}%</p>
                </div>
              </div>
            )}

            {/* Smart Suggestions */}
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold text-slate-200">Sugestões para o Casal</h2>
              </div>
              <div className="space-y-2.5">
                {suggestions.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                    <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">
                      {i + 1}
                    </span>
                    <p className="leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
