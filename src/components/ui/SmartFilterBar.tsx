import { type SortOption } from '../../hooks/useSmartFilters';
import { useId } from 'react';

/* ─── Types ─── */

export interface SmartFilterBarProps {
  /** Currently active category slug */
  activeCategory: string;
  /** All available category slugs (e.g. ['all', 'fashion', 'print', 'textiles']) */
  categories: string[];
  /** Human-readable labels keyed by slug (if omitted, slug is capitalised) */
  categoryLabels?: Record<string, string>;
  /** Current search value */
  searchQuery: string;
  /** Current sort key */
  sortBy: SortOption;
  /** Called on every search keystroke */
  onSearchChange: (q: string) => void;
  /** Called when a category chip is clicked */
  onCategoryChange: (cat: string) => void;
  /** Called when the sort dropdown changes */
  onSortChange: (sort: SortOption) => void;
  /** Show/hide the sort dropdown (default true) */
  showSort?: boolean;
  /** Search placeholder text */
  searchPlaceholder?: string;
  /** Optional extra content rendered right of the category chips */
  extra?: React.ReactNode;
}

/* ─── Helpers ─── */

function labelFor(slug: string, labels?: Record<string, string>): string {
  if (labels?.[slug]) return labels[slug];
  if (slug === 'all') return 'All';
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
}

/* ─── Component ─── */

export default function SmartFilterBar({
  activeCategory,
  categories,
  categoryLabels,
  searchQuery,
  sortBy,
  onSearchChange,
  onCategoryChange,
  onSortChange,
  showSort = true,
  searchPlaceholder = 'Search collections…',
  extra,
}: SmartFilterBarProps) {
  const searchId = useId();
  const sortId = useId();

  const isActive = (slug: string) => activeCategory === slug;

  return (
    <div className="space-y-5">
      {/* Row 1 — Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-300 pointer-events-none"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            id={searchId}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-border-light bg-surface focus:outline-none focus:border-gold-300 focus:ring-1 focus:ring-gold-200/40 transition-all text-sm text-charcoal-600 placeholder:text-charcoal-300"
          />
          {/* Clear button */}
          {searchQuery.length > 0 && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-charcoal-300 hover:text-charcoal-500 transition-colors rounded-full hover:bg-ivory-100"
              aria-label="Clear search"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Sort dropdown */}
        {showSort && (
          <div className="relative">
            <label htmlFor={sortId} className="sr-only">Sort by</label>
            <select
              id={sortId}
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="appearance-none w-full sm:w-auto pl-4 pr-10 py-3 rounded-xl border border-border-light bg-surface focus:outline-none focus:border-gold-300 focus:ring-1 focus:ring-gold-200/40 transition-all text-sm text-charcoal-500 cursor-pointer"
            >
              <option value="newest">Newest</option>
              <option value="trending">Trending</option>
            </select>
            {/* Chevron */}
            <svg
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        )}

        {extra}
      </div>

      {/* Row 2 — Category tabs as editorial text links with active underline indicator */}
      <div className="flex gap-6 md:gap-8 overflow-x-auto scrollbar-none">
        {categories.map((slug) => (
          <button
            key={slug}
            onClick={() => onCategoryChange(slug)}
            className={`flex-shrink-0 text-xs tracking-[0.15em] uppercase font-medium transition-all duration-200 pb-1 ${
              isActive(slug)
                ? 'text-black font-semibold border-b-2 border-black'
                : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'
            }`}
          >
            {labelFor(slug, categoryLabels)}
          </button>
        ))}
      </div>
    </div>
  );
}
