'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface ToastProps {
  message: string;
  visible: boolean;
  onDone: () => void;
  duration?: number;
}

export default function Toast({ message, visible, onDone, duration = 2000 }: ToastProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(onDone, 300);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onDone]);

  if (!visible && !show) return null;

  return (
    <div
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="flex items-center gap-2 bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30">
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        {message}
      </div>
    </div>
  );
}
