import { cn } from '../../lib/utils';

interface DrapeWordmarkProps {
  className?: string;
  light?: boolean;
}

export default function DrapeWordmark({ className, light = false }: DrapeWordmarkProps) {
  return (
    <span className={cn('font-heading tracking-tight select-none', light ? 'text-white' : 'text-charcoal-800', className)}>
      <span className="font-bold">Drapé</span>
      <span className="font-light text-charcoal-300">Collective</span>
    </span>
  );
}
