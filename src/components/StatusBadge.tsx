'use client';

import { TransactionStatus } from '@/types';
import { CheckCircle2, Clock } from 'lucide-react';

interface StatusBadgeProps {
  status: TransactionStatus;
  onToggle: () => void;
}

export default function StatusBadge({ status, onToggle }: StatusBadgeProps) {
  const isPago = status === 'pago';

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide uppercase transition-all duration-200 active:scale-95 select-none ${
        isPago
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm shadow-amber-500/10'
      }`}
      title={isPago ? 'Clique para marcar como pendente' : 'Clique para marcar como pago'}
    >
      {isPago ? (
        <CheckCircle2 className="w-3.5 h-3.5" />
      ) : (
        <Clock className="w-3.5 h-3.5" />
      )}
      {isPago ? 'Pago' : 'Pendente'}
    </button>
  );
}
