import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { applyWatermark } from '../../lib/watermark';
import type { TablesInsert } from '../../types/database';

type ProductInsert = TablesInsert<'products'>;

const CATEGORIES = [
  'clothing', 'accessories', 'footwear', 'sustainable', 'avant-garde',
  'streetwear', 'couture', 'knitwear', 'denim', 'leather', 'jewelry', 'bags',
];

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

interface UploadWorkModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Designer display name used in the watermark (brand_name or username) */
  designerName?: string;
}

export default function UploadWorkModal({ open, onClose, onSuccess, designerName }: UploadWorkModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [materials, setMaterials] = useState('');
  const [sizes, setSizes] = useState<string[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'details' | 'photos'>('details');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayName = designerName || 'Designer';

  const reset = () => {
    setName('');
    setDescription('');
    setCategory('');
    setPrice('');
    setMaterials('');
    setSizes([]);
    setImages([]);
    imagePreviews.forEach((p) => URL.revokeObjectURL(p));
    setImagePreviews([]);
    setError('');
    setStep('details');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || images.length + files.length > 5) return;

    const newImages: File[] = [];
    const newPreviews: string[] = [];

    for (const file of files) {
      try {
        const imageCompression = (await import('browser-image-compression')).default;
        const compressed = await imageCompression(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 2048,
          useWebWorker: true,
        });
        newImages.push(compressed);
        newPreviews.push(URL.createObjectURL(compressed));
      } catch {
        newImages.push(file);
        newPreviews.push(URL.createObjectURL(file));
      }
    }

    setImages((prev) => [...prev, ...newImages]);
    setImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleSize = (size: string) => {
    setSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size],
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Product name is required'); return; }
    if (!price || parseFloat(price) <= 0) { setError('Enter a valid price'); return; }
    if (images.length === 0) { setError('Upload at least one photo'); return; }

    setUploading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // ── Upload watermarked images ──
      const imageUrls: string[] = [];
      const errors: string[] = [];

      for (const file of images) {
        try {
          // Apply the premium watermark
          const watermarkedBlob = await applyWatermark(file, displayName);

          // Sanitise filename — strip spaces, special chars, keep extension
          const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
          const sanitisedName = file.name
            .replace(/\.[^/.]+$/, '')           // strip original extension
            .replace(/[^a-zA-Z0-9_-]/g, '-')     // replace unsafe chars with dash
            .replace(/-+/g, '-')                  // collapse consecutive dashes
            .replace(/^-|-$/g, '')                // trim leading/trailing dashes
            .toLowerCase()
            .slice(0, 60);                        // cap length

          const watermarkFile = new File([watermarkedBlob], `${sanitisedName}.${ext}`, {
            type: 'image/jpeg',
          });

          // Clean path inside the bucket: userId / timestamp-random . ext
          const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from('products')
            .upload(path, watermarkFile, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            console.error('UploadWorkModal — image upload error:', uploadError);
            errors.push(`${sanitisedName}: ${uploadError.message}`);
            continue;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('products')
            .getPublicUrl(path);
          imageUrls.push(publicUrl);
        } catch (perFileErr) {
          const msg = perFileErr instanceof Error ? perFileErr.message : 'Unknown error';
          console.error('UploadWorkModal — per-file error:', perFileErr);
          errors.push(`${file.name}: ${msg}`);
        }
      }

      // Show partial-failure feedback instead of silently dropping images
      if (errors.length > 0 && imageUrls.length === 0) {
        throw new Error(
          `Unable to upload any images. ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? ` (+${errors.length - 3} more)` : ''}`
        );
      }
      if (errors.length > 0) {
        // Partial success — surface a warning but still save what we have
        console.warn('UploadWorkModal — some images failed:', errors);
        setError(
          `${imageUrls.length} of ${images.length} images uploaded. Issues: ${errors.slice(0, 2).join('; ')}`
        );
      }

      // Create product — instantly published, no moderation queue
      const product: TablesInsert<'products'> = {
        user_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
        category: category || null,
        price: parseFloat(price) || null,
        materials: materials ? materials.split(',').map((s) => s.trim()).filter(Boolean) : [],
        sizes: sizes.length > 0 ? sizes : null,
        image_urls: imageUrls.length > 0 ? imageUrls : null,
        status: 'published',
        is_hidden: false,
      };

      const { error: insertError } = await supabase.from('products').insert(product);
      if (insertError) throw insertError;

      reset();
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to upload';
      console.error('UploadWorkModal — submit error:', err);
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-charcoal-900/60 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-surface rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-elevation-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-light">
          <div>
            <h2 className="text-lg font-serif text-charcoal-700">Upload New Work</h2>
            <p className="text-xs text-charcoal-300 mt-0.5">
              {step === 'details' ? 'Step 1 of 2 — Product details' : 'Step 2 of 2 — Photos'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-charcoal-300 hover:text-charcoal-500 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1 px-6 pt-3">
          <div
            className={`h-1 flex-1 rounded-full transition-colors ${
              step === 'details' ? 'bg-charcoal-700' : 'bg-gold-400'
            }`}
          />
          <div
            className={`h-1 flex-1 rounded-full transition-colors ${
              step === 'photos' ? 'bg-charcoal-700' : 'bg-ivory-200'
            }`}
          />
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-error/5 text-error text-xs border border-error/10">{error}</div>
          )}

          {step === 'details' ? (
            <>
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-charcoal-500 mb-1.5 tracking-wide">Product Name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border-light bg-surface focus:outline-none focus:border-gold-300 transition-colors text-sm text-charcoal-600 placeholder:text-charcoal-300"
                  placeholder="e.g. Deconstructed Blazer"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-charcoal-500 mb-1.5 tracking-wide">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-border-light bg-surface focus:outline-none focus:border-gold-300 transition-colors text-sm text-charcoal-600 placeholder:text-charcoal-300 resize-none"
                  placeholder="Tell the story behind this piece..."
                />
              </div>

              {/* Category + Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-charcoal-500 mb-1.5 tracking-wide">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border-light bg-surface focus:outline-none focus:border-gold-300 transition-colors text-sm text-charcoal-600"
                  >
                    <option value="">Select</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-charcoal-500 mb-1.5 tracking-wide">Price (USh) *</label>
                  <input
                    type="number"
                    min={0}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border-light bg-surface focus:outline-none focus:border-gold-300 transition-colors text-sm text-charcoal-600 placeholder:text-charcoal-300"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Materials */}
              <div>
                <label className="block text-xs font-medium text-charcoal-500 mb-1.5 tracking-wide">Materials</label>
                <input
                  value={materials}
                  onChange={(e) => setMaterials(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border-light bg-surface focus:outline-none focus:border-gold-300 transition-colors text-sm text-charcoal-600 placeholder:text-charcoal-300"
                  placeholder="e.g. Silk, Cotton, Linen (comma-separated)"
                />
              </div>

              {/* Sizes */}
              <div>
                <label className="block text-xs font-medium text-charcoal-500 mb-1.5 tracking-wide">Available Sizes</label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => toggleSize(size)}
                      className={`w-10 h-10 rounded-lg text-xs font-medium border transition-all ${
                        sizes.includes(size)
                          ? 'bg-charcoal-700 text-white border-charcoal-700'
                          : 'bg-surface text-charcoal-400 border-border-light hover:border-gold-200'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!name.trim() || !price || parseFloat(price) <= 0) {
                      setError('Product name and valid price are required');
                      return;
                    }
                    setError('');
                    setStep('photos');
                  }}
                  className="btn-luxury btn-luxury-primary text-xs"
                >
                  Next — Add Photos
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Photos */}
              <div>
                <label className="block text-xs font-medium text-charcoal-500 mb-3 tracking-wide">Photos * (up to 5)</label>
                <div className="grid grid-cols-5 gap-3">
                  {imagePreviews.map((preview, i) => (
                    <div key={i} className="relative aspect-[3/4] bg-ivory-100 rounded-lg overflow-hidden border border-border-light group">
                      <img src={preview} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-charcoal-800/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {images.length < 5 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-[3/4] rounded-lg border-2 border-dashed border-border-light bg-ivory-50 flex flex-col items-center justify-center gap-1 hover:border-gold-300 hover:bg-gold-50/20 transition-all"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-charcoal-300">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                      </svg>
                      <span className="text-[10px] text-charcoal-300">Add</span>
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageSelect}
                />
              </div>

              {/* Watermark notice */}
              <p className="text-[10px] text-charcoal-300 text-center italic leading-relaxed">
                A subtle watermark (&ldquo;{displayName} | Drap&eacute; Collective&rdquo;) will be applied to protect your work.
              </p>

              {/* Navigation */}
              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="text-sm text-charcoal-400 hover:text-charcoal-600 transition-colors tracking-wide flex items-center gap-1.5"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={uploading || images.length === 0}
                  className="btn-luxury btn-luxury-primary text-xs disabled:opacity-50"
                >
                  {uploading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border border-white/30 border-t-transparent rounded-full animate-spin" />
                      Watermarking &amp; Uploading...
                    </span>
                  ) : (
                    'Upload Product'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
