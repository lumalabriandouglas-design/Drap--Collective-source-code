interface SmartEmptyStateProps {
  /** Icon variant — magnifier / hanger / file-text */
  icon?: 'search' | 'filter' | 'category';
  /** Main message (default: 'Nothing to show') */
  title?: string;
  /** Secondary guidance (default: 'Try adjusting your search or filters.') */
  subtitle?: string;
  /** Optional action label */
  actionLabel?: string;
  /** Optional action callback (e.g. reset all filters) */
  onAction?: () => void;
}

const icons = {
  search: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-charcoal-300">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  filter: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-charcoal-300">
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
    </svg>
  ),
  category: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-charcoal-300">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
};

export default function SmartEmptyState({
  icon = 'search',
  title = 'Nothing to show',
  subtitle = 'Try adjusting your search or filters.',
  actionLabel,
  onAction,
}: SmartEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 md:py-24 animate-empty-in">
      <div className="w-16 h-16 rounded-full bg-ivory-100 flex items-center justify-center mb-4">
        {icons[icon]}
      </div>
      <p className="text-charcoal-400 text-sm font-medium">{title}</p>
      <p className="text-charcoal-300 text-xs mt-1 max-w-xs text-center">{subtitle}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 text-xs tracking-wider uppercase text-gold-500 hover:text-gold-600 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
