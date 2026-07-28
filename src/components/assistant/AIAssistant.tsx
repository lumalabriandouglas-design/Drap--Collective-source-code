import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const INITIAL_SUGGESTIONS = [
  'How do I sign up as a designer?',
  'How does the marketplace work?',
  'Tell me about Drapé Collective',
  'How does messaging work?',
];

const WELCOME_MESSAGE: ChatMessage = {
  role: 'assistant',
  content:
    "Welcome to Drapé Collective! I'm your personal guide. Feel free to ask me anything about the platform — how to sign up, browse collections, or connect with designers.",
};

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setShowSuggestions(false);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          messages: messages
            .concat(userMsg)
            .map((m) => ({ role: m.role, content: m.content })),
        },
      });

      if (error) throw error;

      const reply: ChatMessage = {
        role: 'assistant',
        content:
          data?.reply ||
          "I'm taking a quick break — please check back soon!",
      };
      setMessages((prev) => [...prev, reply]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "I'm taking a quick break — please check back soon!",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearConversation = () => {
    setMessages([WELCOME_MESSAGE]);
    setShowSuggestions(true);
  };

  return (
    <>
      {/* Floating Bubble */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-elevation-3 flex items-center justify-center transition-all duration-300 ${
          open
            ? 'bg-charcoal-700 rotate-45 scale-90'
            : 'bg-gold-400 hover:bg-gold-500 hover:scale-105'
        }`}
        aria-label={open ? 'Close assistant' : 'Open assistant'}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
            <path d="M12 8v4M12 16h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </button>

      {/* Slide-out Panel */}
      <div
        className={`fixed bottom-24 right-6 z-40 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-8rem)] bg-surface rounded-2xl shadow-elevation-3 border border-border-light flex flex-col transition-all duration-400 ${
          open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border-light flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gold-100 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gold-500">
                <path d="M12 8v4M12 16h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-charcoal-700">Drapé Assistant</p>
              <p className="text-[10px] text-charcoal-300">AI Guide</p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearConversation}
            className="text-[10px] text-charcoal-300 hover:text-charcoal-500 transition-colors tracking-wide"
            title="Clear conversation"
          >
            Clear
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-charcoal-700 text-white rounded-tr-md'
                    : 'bg-ivory-100 text-charcoal-600 rounded-tl-md'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-ivory-100 px-4 py-3 rounded-2xl rounded-tl-md">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-charcoal-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-charcoal-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-charcoal-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {showSuggestions && messages.length === 1 && (
          <div className="px-4 pb-2">
            <p className="text-[10px] text-charcoal-300 mb-2 tracking-wide uppercase">Try asking:</p>
            <div className="flex flex-wrap gap-1.5">
              {INITIAL_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => sendMessage(suggestion)}
                  className="text-xs bg-ivory-50 hover:bg-ivory-200 text-charcoal-500 px-3 py-1.5 rounded-full border border-border-light transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 border-t border-border-light flex-shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-border-light bg-bg px-3.5 py-2.5 text-sm text-charcoal-600 placeholder:text-charcoal-300 focus:outline-none focus:border-gold-300 transition-colors"
              style={{ minHeight: '38px', maxHeight: '80px' }}
            />
            <button
              type="button"
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="flex-shrink-0 p-2.5 rounded-full bg-gold-400 text-white hover:bg-gold-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Send"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
