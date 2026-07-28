interface LivePreviewProps {
  open: boolean;
  onClose: () => void;
  name: string;
  category: string;
  description: string;
  artisticStatement: string;
  images: string[];
  videoUrl: string;
  price: string;
  materials: string[];
  brandName: string;
}

export default function LivePreview({
  open, onClose, name, category, description,
  artisticStatement, images, videoUrl, price, materials, brandName,
}: LivePreviewProps) {
  if (!open) return null;

  const hasContent = name || images.length > 0 || description || artisticStatement;

  return (
    <div
      className="fixed inset-0 z-[60] bg-charcoal-900/70 flex items-start justify-center p-4 pt-12 md:pt-16 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-bg rounded-2xl overflow-hidden shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '90vh' }}
      >
        {/* Preview chrome */}
        <div className="sticky top-0 z-10 bg-surface border-b border-border-light px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-error/80" />
            <div className="w-3 h-3 rounded-full bg-gold-400/80" />
            <div className="w-3 h-3 rounded-full bg-success/80" />
            <span className="ml-4 text-[10px] tracking-[0.15em] uppercase text-charcoal-300 font-medium">
              Public Preview
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-charcoal-400 hover:text-charcoal-700 transition-colors tracking-wide flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            Close
          </button>
        </div>

        {!hasContent ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-6">
            <div className="w-20 h-20 rounded-full bg-ivory-100 flex items-center justify-center mb-6">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-charcoal-300">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <p className="text-charcoal-400 text-sm font-medium">Nothing to preview yet</p>
            <p className="text-charcoal-300 text-xs mt-1">Add images and details to see your live preview.</p>
          </div>
        ) : (
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 64px)' }}>
            {/* ═════ PUBLIC-FACING PREVIEW ═════ */}

            {/* Hero image */}
            {images.length > 0 && (
              <div className="relative w-full aspect-[16/10] md:aspect-[21/9] bg-charcoal-900 overflow-hidden">
                <img
                  src={images[0]}
                  alt={name}
                  className="w-full h-full object-cover"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/80 via-charcoal-900/10 to-transparent" />

                {/* Category badge */}
                {category && (
                  <div className="absolute top-6 left-6">
                    <span className="text-[10px] tracking-[0.15em] uppercase text-white/80 bg-white/10 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/10">
                      {category}
                    </span>
                  </div>
                )}

                {/* Title on hero */}
                <div className="absolute bottom-6 left-6 right-6">
                  <h1 className="text-3xl md:text-5xl font-serif text-white leading-tight">
                    {name || 'Untitled'}
                  </h1>
                  {brandName && (
                    <p className="mt-2 text-sm text-white/60 tracking-wide">{brandName}</p>
                  )}
                </div>
              </div>
            )}

            <div className="max-w-5xl mx-auto px-6 py-10 md:py-14">
              {/* Gallery — Masonry-style grid */}
              {images.length > 1 && (
                <div className="mb-12">
                  <span className="text-[10px] tracking-[0.2em] uppercase text-gold-500 font-medium">Gallery</span>
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    {images.slice(1).map((img, i) => (
                      <div
                        key={i}
                        className={`overflow-hidden rounded-xl bg-ivory-100 border border-border-light group ${
                          i === 0 ? 'md:col-span-2 md:row-span-2' : ''
                        }`}
                      >
                        <img
                          src={img}
                          alt={`${name} ${i + 2}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          style={{ minHeight: i === 0 ? '320px' : '200px' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Video embed */}
              {videoUrl && (
                <div className="mb-12">
                  <span className="text-[10px] tracking-[0.2em] uppercase text-gold-500 font-medium">Runway / Motion</span>
                  <div className="mt-4 aspect-video rounded-xl overflow-hidden bg-charcoal-900 border border-border-light">
                    {videoUrl.includes('youtube') || videoUrl.includes('vimeo') ? (
                      <iframe
                        src={videoUrl.replace('watch?v=', 'embed/')}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : videoUrl.includes('.mp4') || videoUrl.includes('.webm') ? (
                      <video controls className="w-full h-full object-cover" src={videoUrl} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/40 text-xs">
                        Unsupported video URL
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Description + Details */}
              <div className="grid md:grid-cols-5 gap-8 mb-12">
                <div className="md:col-span-3">
                  {description && (
                    <div>
                      <span className="text-[10px] tracking-[0.2em] uppercase text-gold-500 font-medium">Description</span>
                      <p className="mt-3 text-sm md:text-base text-charcoal-500 leading-relaxed font-light">
                        {description}
                      </p>
                    </div>
                  )}

                  {artisticStatement && (
                    <div className="mt-10">
                      <span className="text-[10px] tracking-[0.2em] uppercase text-gold-500 font-medium">The Narrative</span>
                      <div
                        className="mt-3 text-sm md:text-base text-charcoal-500 leading-relaxed font-serif italic"
                        dangerouslySetInnerHTML={{ __html: artisticStatement }}
                      />
                    </div>
                  )}
                </div>

                <div className="md:col-span-2 md:pl-4 md:border-l border-border-light">
                  <span className="text-[10px] tracking-[0.2em] uppercase text-gold-500 font-medium">Details</span>
                  <div className="mt-4 space-y-4">
                    {price && (
                      <div>
                        <p className="text-[10px] tracking-wide text-charcoal-300">Price</p>
                        <p className="text-lg font-medium text-charcoal-700">€{Number(price).toLocaleString()}</p>
                      </div>
                    )}
                    {materials.length > 0 && (
                      <div>
                        <p className="text-[10px] tracking-wide text-charcoal-300">Materials</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {materials.map((m) => (
                            <span key={m} className="text-[10px] text-charcoal-500 bg-ivory-100 px-2.5 py-1 rounded-full">
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {category && (
                      <div>
                        <p className="text-[10px] tracking-wide text-charcoal-300">Category</p>
                        <p className="text-sm text-charcoal-600">{category}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* CTA Footer */}
              <div className="border-t border-border-light pt-8 flex items-center justify-between">
                <div>
                  <p className="text-xs text-charcoal-300">{brandName || 'Independent Designer'}</p>
                </div>
                <button className="btn-luxury btn-luxury-primary text-xs" disabled>
                  Inquire
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
