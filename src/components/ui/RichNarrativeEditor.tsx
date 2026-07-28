import { useRef, useEffect, useState } from 'react';

interface RichNarrativeEditorProps {
  value: string;
  onChange: (html: string) => void;
  maxLength?: number;
}

export default function RichNarrativeEditor({ value, onChange, maxLength = 2000 }: RichNarrativeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    handleInput();
  };

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html === '<br>' ? '' : html);
    }
  };

  const charCount = editorRef.current?.textContent?.replace(/\s/g, '').length || 0;
  const overLimit = maxLength && charCount > maxLength;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-charcoal-500 tracking-wide">
          Artistic Narrative
        </label>
        <span className={`text-[10px] tracking-wide ${overLimit ? 'text-error' : 'text-charcoal-300'}`}>
          {charCount}/{maxLength}
        </span>
      </div>

      {/* Toolbar */}
      <div className={`flex items-center gap-1 p-2 rounded-t-xl border border-border-light border-b-0 transition-colors ${
        isFocused ? 'bg-ivory-50' : 'bg-surface'
      }`}>
        <ToolbarButton onClick={() => exec('italic')} title="Italic" icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 4h-9M14 20H5M15 4L9 20"/></svg>
        } />
        <ToolbarButton onClick={() => exec('bold')} title="Bold" icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6zM6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z"/></svg>
        } />
        <div className="w-px h-5 bg-border-light mx-1" />
        <ToolbarButton onClick={() => exec('insertUnorderedList')} title="Bullet list" icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        } />
        <ToolbarButton onClick={() => exec('insertOrderedList')} title="Numbered list" icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
        } />
        <div className="w-px h-5 bg-border-light mx-1" />
        <ToolbarButton onClick={() => exec('formatBlock', 'h3')} title="Heading" icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 4v16M18 4v16M6 12h12"/></svg>
        } />
        <ToolbarButton onClick={() => exec('formatBlock', 'p')} title="Paragraph" icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 2H6a4 4 0 000 8h4v12M13 2h5"/></svg>
        } />
        <div className="w-px h-5 bg-border-light mx-1" />
        <ToolbarButton onClick={() => exec('insertHorizontalRule')} title="Divider" icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="3" y1="12" x2="21" y2="12"/></svg>
        } />
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`
          min-h-[180px] max-h-[320px] overflow-y-auto px-5 py-4 rounded-b-xl border
          text-sm text-charcoal-600 leading-relaxed
          transition-all duration-300 focus:outline-none
          ${isFocused
            ? 'border-gold-300 bg-surface shadow-sm'
            : 'border-border-light bg-surface'
          }
        `}
        data-placeholder="Describe the inspiration, materials, and story behind this piece..."
        style={{
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          lineHeight: '1.8',
        }}
      />
      {overLimit && (
        <p className="text-[10px] text-error flex items-center gap-1">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Character limit exceeded
        </p>
      )}

      {/* Placeholder via CSS */}
      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: var(--color-charcoal-300);
          pointer-events: none;
        }
        [contenteditable]:focus:empty:before {
          color: var(--color-charcoal-200);
        }
      `}</style>
    </div>
  );
}

function ToolbarButton({ onClick, title, icon }: { onClick: () => void; title: string; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="w-8 h-8 flex items-center justify-center rounded-lg text-charcoal-400 hover:text-charcoal-700 hover:bg-ivory-100 transition-all"
    >
      {icon}
    </button>
  );
}