'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MONTHS } from '@/types';

interface MonthSelectorProps {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
}

export default function MonthSelector({ month, year, onChange }: MonthSelectorProps) {
  const goToPrevious = () => {
    if (month === 1) {
      onChange(12, year - 1);
    } else {
      onChange(month - 1, year);
    }
  };

  const goToNext = () => {
    if (month === 12) {
      onChange(1, year + 1);
    } else {
      onChange(month + 1, year);
    }
  };

  return (
    <div className="flex items-center justify-between bg-slate-800/50 rounded-2xl p-3 backdrop-blur-sm">
      <button
        onClick={goToPrevious}
        className="p-2 rounded-xl hover:bg-slate-700/50 active:bg-slate-700 transition-colors"
        aria-label="Mês anterior"
      >
        <ChevronLeft className="w-5 h-5 text-slate-300" />
      </button>
      
      <div className="text-center">
        <p className="text-lg font-semibold text-white">
          {MONTHS[month - 1]}
        </p>
        <p className="text-xs text-slate-400">{year}</p>
      </div>
      
      <button
        onClick={goToNext}
        className="p-2 rounded-xl hover:bg-slate-700/50 active:bg-slate-700 transition-colors"
        aria-label="Próximo mês"
      >
        <ChevronRight className="w-5 h-5 text-slate-300" />
      </button>
    </div>
  );
}
