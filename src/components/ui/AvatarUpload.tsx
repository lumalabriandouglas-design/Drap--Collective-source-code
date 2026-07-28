import { useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface AvatarUploadProps {
  currentUrl: string | null;
  userId: string;
  onUploadComplete: (url: string) => void;
  size?: number;
}

export default function AvatarUpload({
  currentUrl,
  userId,
  onUploadComplete,
  size = 120,
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return; // 5MB limit

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${userId}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('designer-avatars')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('designer-avatars')
        .getPublicUrl(path);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_photo_url: publicUrl })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      onUploadComplete(publicUrl);
    } catch (err) {
      console.error('AvatarUpload — error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={handleSelect}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        disabled={uploading}
        className={`relative rounded-full overflow-hidden border-2 transition-all duration-300 cursor-pointer group
          ${dragOver ? 'border-gold-400 scale-105' : 'border-border-light hover:border-gold-300'}
          ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
        style={{ width: size, height: size }}
      >
        {currentUrl ? (
          <img
            src={currentUrl}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-ivory-100 flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-charcoal-200">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-charcoal-800/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {uploading ? (
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          )}
        </div>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />

      <p className="text-[10px] text-charcoal-300 tracking-wide">
        {uploading ? 'Uploading\u2026' : 'Click or drag to update photo'}
      </p>
    </div>
  );
}
