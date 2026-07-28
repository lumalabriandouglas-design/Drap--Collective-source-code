import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';

interface ToastProps {
  message: string;
  visible: boolean;
  onClose: () => void;
  duration?: number;
  type?: 'success' | 'error' | 'info';
}

export default function Toast({
  message,
  visible,
  onClose,
  duration = 2500,
  type = 'success',
}: ToastProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      const timer = setTimeout(() => {
        setMounted(false);
        setTimeout(onClose, 300);
      }, duration);
      return () => clearTimeout(timer);
    }
    setMounted(false);
  }, [visible, duration, onClose]);

  if (!mounted && !visible) return null;

  const bgMap = {
    success: 'bg-charcoal-700',
    error: 'bg-error',
    info: 'bg-gold-600',
  };

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ease-out ${
        mounted
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <div
        className={`${bgMap[type]} text-white px-5 py-3 rounded-full shadow-elevation-3 flex items-center gap-2.5 text-sm font-medium tracking-wide`}
      >
        {type === 'success' ? (
          <Check className="w-4 h-4 shrink-0" />
        ) : (
          <X className="w-4 h-4 shrink-0" />
        )}
        <span>{message}</span>
      </div>
    </div>
  );
}
