import { useState, useRef, useCallback } from 'react';

interface DragDropGridProps {
  images: File[];
  previews: string[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
  onReorder?: (images: File[]) => void;
  maxFiles?: number;
}

export default function DragDropGrid({
  images, previews, onAdd, onRemove, maxFiles = 12,
}: DragDropGridProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const compressImage = useCallback(async (file: File): Promise<File> => {
    try {
      const imageCompression = (await import('browser-image-compression')).default;
      return await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 2400,
        useWebWorker: true,
      });
    } catch {
      return file;
    }
  }, []);

  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0 || images.length + files.length > maxFiles) return;

    const compressed: File[] = [];
    for (const f of files) {
      compressed.push(await compressImage(f));
    }
    onAdd(compressed);
  }, [images.length, maxFiles, onAdd, compressImage]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const remaining = maxFiles - images.length;

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`
          relative cursor-pointer rounded-2xl border-2 border-dashed p-10 
          transition-all duration-500 text-center group
          ${dragOver
            ? 'border-gold-400 bg-gold-50/30 shadow-gold scale-[1.02]'
            : 'border-border-light hover:border-gold-300 hover:bg-ivory-50'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-3">
          {/* Icon */}
          <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 ${
            dragOver ? 'bg-gold-100 scale-110' : 'bg-ivory-100 group-hover:bg-gold-50'
          }`}>
            <svg
              width="26" height="26" viewBox="0 0 24 24"
              fill="none" stroke="currentColor"
              strokeWidth="1.2"
              className={`transition-colors duration-500 ${dragOver ? 'text-gold-500' : 'text-charcoal-300'}`}
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
          </div>

          <div>
            <p className="text-sm text-charcoal-500 font-medium">
              {dragOver ? 'Drop your media here' : 'Drop your media here or click to browse'}
            </p>
            <p className="text-xs text-charcoal-300 mt-1">
              JPEG, PNG, WebP, or MP4 &middot; Up to {maxFiles} slots remaining
            </p>
          </div>

          {remaining > 0 && (
            <span className="text-[10px] tracking-wider text-charcoal-300 bg-ivory-100 px-3 py-1 rounded-full">
              {remaining} slot{remaining !== 1 ? 's' : ''} remaining
            </span>
          )}
        </div>
      </div>

      {/* Masonry preview grid */}
      {previews.length > 0 && (
        <div className="masonry-grid">
          {previews.map((src, i) => (
            <div key={src} className="masonry-item group/image relative overflow-hidden rounded-xl bg-ivory-100 border border-border-light">
              <img
                src={src}
                alt={`Upload ${i + 1}`}
                className="w-full h-full object-cover transition-transform duration-700 group-hover/image:scale-105"
                style={{ minHeight: i % 3 === 0 ? '320px' : i % 3 === 1 ? '240px' : '280px' }}
              />

              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-charcoal-900/0 group-hover/image:bg-charcoal-900/40 transition-all duration-500 flex items-center justify-center opacity-0 group-hover/image:opacity-100">
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(i); }}
                  className="w-10 h-10 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-charcoal-600 hover:text-error transition-colors shadow-lg"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Image index badge */}
              <div className="absolute top-3 left-3 w-6 h-6 rounded-full bg-charcoal-800/60 backdrop-blur-sm text-white text-[10px] font-medium flex items-center justify-center">
                {i + 1}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}