import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Sparkles } from 'lucide-react';

/* ─── Types ─── */

interface ComingSoonProps {
  title?: string;
  subtitle?: string;
  pageTitle?: string;
  /** Optional label for a Browse button that navigates to /explore */
  buttonLabel?: string;
}

/* ═══════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export default function ComingSoon({
  title = 'Collection Premiering Soon',
  subtitle = 'This feature is currently in preparation for our next drop.',
  pageTitle = 'Coming Soon — Drapé Collective',
  buttonLabel,
}: ComingSoonProps) {
  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>

      <div className="min-h-[70vh] flex items-center justify-center px-4 animate-empty-in">
        <div className="text-center max-w-md">
          {/* Decorative gem / sparkle icon */}
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full border border-gold-300/15" />
            <div className="absolute inset-[3px] rounded-full bg-ivory-100 flex items-center justify-center">
              <Sparkles size={28} className="text-gold-400/40" />
            </div>
          </div>

          {/* Heading — serif, editorial */}
          <h1 className="font-serif text-3xl md:text-4xl text-charcoal-700 leading-tight">
            {title}
          </h1>

          {/* Gold divider */}
          <div className="w-12 h-px bg-gold-300/40 mx-auto my-5" />

          {/* Subtitle — sans-serif, muted */}
          <p className="text-charcoal-400 text-sm md:text-base leading-relaxed max-w-xs mx-auto">
            {subtitle}
          </p>

          {buttonLabel && (
            <Link
              to="/explore"
              className="inline-block mt-8 px-6 py-2.5 bg-charcoal-700 text-white text-sm font-medium rounded-full hover:bg-charcoal-800 transition-all duration-300"
            >
              {buttonLabel}
            </Link>
          )}

          {/* Decorative lower accent — fine gold line */}
          <div className="mt-10 flex items-center justify-center gap-3">
            <span className="block w-8 h-px bg-gold-300/30" />
            <span className="block w-1.5 h-1.5 rounded-full bg-gold-300/20" />
            <span className="block w-8 h-px bg-gold-300/30" />
          </div>
        </div>
      </div>
    </>
  );
}
