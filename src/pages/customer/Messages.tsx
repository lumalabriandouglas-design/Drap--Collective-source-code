import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Conversation, Message, Profile, Product } from '../../types/supabase';
import {
  Send,
  MessageCircle,
  ChevronLeft,
  Check,
  CheckCheck,
  Bell,
  BellOff,
  Paperclip,
  ExternalLink,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import {
  isPushSupported,
  setupPush,
  unsubscribeFromPush,
  getSubscription,
} from '../../lib/pushNotifications';

type ConversationRow = Conversation & {
  otherUser?: Profile;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
};

/* ───────── Avatar ───────── */
function Avatar({
  name,
  url,
  size = 'w-10 h-10',
}: {
  name?: string | null;
  url?: string | null;
  size?: string;
}) {
  const initials = name
    ? name
        .split(/\s+/)
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  if (url) {
    return (
      <img
        src={url}
        alt={name || 'User'}
        className={`${size} rounded-full object-cover flex-shrink-0 bg-ivory-100`}
      />
    );
  }

  return (
    <div
      className={`${size} rounded-full bg-ivory-200 flex items-center justify-center flex-shrink-0`}
    >
      <span className="text-xs font-medium text-charcoal-500">{initials}</span>
    </div>
  );
}

/* ───────── Read ticks ───────── */
function TickStatus({ is_read, status }: { is_read: boolean; status: string }) {
  if (is_read || status === 'read') {
    return (
      <span className="inline-flex items-center ml-1">
        <CheckCheck size={12} className="text-gold-400" strokeWidth={2.5} />
      </span>
    );
  }
  if (status === 'delivered') {
    return (
      <span className="inline-flex items-center ml-1">
        <CheckCheck size={12} className="text-charcoal-300/60" strokeWidth={2.5} />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center ml-1">
      <Check size={12} className="text-charcoal-300/40" strokeWidth={2.5} />
    </span>
  );
}

/* ───────── Time helpers ───────── */
function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return time;

  const date = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${date}`;
}

function formatListTime(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: 'short' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/* ───────── Compact product chip ───────── */
function ProductChip({ product }: { product: Product }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(`/product/${product.id}`)}
      className="flex items-center gap-2.5 w-full max-w-sm p-2 rounded-xl border border-gold-200/60 bg-gold-50/50 text-left hover:border-gold-300 transition-colors cursor-pointer"
    >
      <div className="w-11 h-12 rounded-lg overflow-hidden bg-ivory-200 flex-shrink-0">
        {product.image_urls?.[0] ? (
          <img
            src={product.image_urls[0]}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-charcoal-400 mb-0.5">
          About this piece
        </p>
        <p className="text-xs font-medium text-charcoal-700 truncate">{product.name}</p>
      </div>
      <ExternalLink size={12} className="text-charcoal-300 shrink-0" />
    </button>
  );
}

/* ───────── Main page ───────── */
export default function Messages() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [activeConversation, setActiveConversation] = useState<ConversationRow | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [contextProduct, setContextProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (user) loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* Context product from ?product= */
  useEffect(() => {
    const productId = searchParams.get('product');
    if (!productId) {
      setContextProduct(null);
      return;
    }
    supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()
      .then(({ data }) => {
        if (data) setContextProduct(data as Product);
      });
  }, [searchParams]);

  /* Realtime for active chat */
  useEffect(() => {
    if (!activeConversation || !user) return;
    const channel = supabase
      .channel(`messages:${activeConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversation.id}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeConversation.id
                ? {
                    ...c,
                    lastMessage: msg.content,
                    lastMessageAt: msg.created_at,
                    updated_at: msg.created_at,
                  }
                : c,
            ),
          );
          if (msg.sender_id !== user.id) {
            supabase
              .from('messages')
              .update({
                read_at: new Date().toISOString(),
                status: 'read',
                is_read: true,
              })
              .eq('id', msg.id)
              .then();
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversation.id}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)),
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversation, user]);

  async function enrichConversation(conv: Conversation): Promise<ConversationRow> {
    const otherId = conv.participant_ids.find((id) => id !== user!.id);
    let otherUser: Profile | undefined;
    if (otherId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', otherId)
        .single();
      otherUser = profile || undefined;
    }

    const { data: lastMsgs } = await supabase
      .from('messages')
      .select('content, created_at, image_urls')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: false })
      .limit(1);

    const last = lastMsgs?.[0];
    const lastMessage = last
      ? last.image_urls && last.image_urls.length > 0 && (!last.content || last.content === '(Image)')
        ? 'Photo'
        : last.content
      : null;

    return {
      ...conv,
      otherUser,
      lastMessage,
      lastMessageAt: last?.created_at || conv.updated_at,
    };
  }

  async function loadConversations() {
    setLoading(true);
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .contains('participant_ids', [user!.id])
      .order('updated_at', { ascending: false });

    const convs = data || [];
    const withUsers = await Promise.all(convs.map((c) => enrichConversation(c)));
    setConversations(withUsers);
    setLoading(false);

    const ids = convs.map((c) => c.id);
    if (ids.length > 0) {
      const { data: unreadMsgs } = await supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', ids)
        .eq('is_read', false)
        .neq('sender_id', user!.id);

      const countMap: Record<string, number> = {};
      (unreadMsgs || []).forEach((m) => {
        countMap[m.conversation_id] = (countMap[m.conversation_id] || 0) + 1;
      });
      setUnreadCounts(countMap);
    }

    const designerId = searchParams.get('designer');
    if (designerId) {
      const existing = withUsers.find((c) => c.participant_ids.includes(designerId));
      if (existing) {
        setActiveConversation(existing);
        loadMessages(existing.id);
        setShowMobileChat(true);
      } else if (user) {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({ participant_ids: [user.id, designerId] })
          .select()
          .single();

        if (newConv) {
          const enriched = await enrichConversation(newConv);
          setConversations((prev) => [enriched, ...prev]);
          setActiveConversation(enriched);
          setShowMobileChat(true);
        }
      }
    }
  }

  async function loadMessages(conversationId: string) {
    await supabase
      .from('messages')
      .update({ status: 'delivered' })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user!.id)
      .eq('status', 'sent');

    await supabase
      .from('messages')
      .update({
        read_at: new Date().toISOString(),
        status: 'read',
        is_read: true,
      })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user!.id)
      .is('read_at', null);

    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    setMessages(data || []);
  }

  function handleSelectConversation(conv: ConversationRow) {
    setActiveConversation(conv);
    loadMessages(conv.id);
    setShowMobileChat(true);
    setUnreadCounts((prev) => ({ ...prev, [conv.id]: 0 }));
  }

  function handleBack() {
    setShowMobileChat(false);
  }

  async function sendMessage() {
    if (!user || !activeConversation || !newMessage.trim()) return;
    const content = newMessage.trim();
    setNewMessage('');
    const { error } = await supabase.from('messages').insert({
      conversation_id: activeConversation.id,
      sender_id: user.id,
      content,
    });
    if (!error) {
      const now = new Date().toISOString();
      await supabase
        .from('conversations')
        .update({ updated_at: now })
        .eq('id', activeConversation.id);
      setConversations((prev) => {
        const next = prev.map((c) =>
          c.id === activeConversation.id
            ? { ...c, lastMessage: content, lastMessageAt: now, updated_at: now }
            : c,
        );
        return next.sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        );
      });
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user || !activeConversation) return;

    setUploadingImage(true);
    try {
      const imageCompression = (await import('browser-image-compression')).default;
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 2048,
        useWebWorker: true,
      });

      const ext = compressed.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const filePath = `${activeConversation.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(filePath, compressed);

      let publicUrl = '';
      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('message-attachments')
          .getPublicUrl(filePath);
        publicUrl = urlData.publicUrl;
      } else {
        const fallbackName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const fallbackPath = `${activeConversation.id}/${fallbackName}`;
        const { error: fallbackError } = await supabase.storage
          .from('message-attachments')
          .upload(fallbackPath, file);
        if (!fallbackError) {
          const { data: urlData } = supabase.storage
            .from('message-attachments')
            .getPublicUrl(fallbackPath);
          publicUrl = urlData.publicUrl;
        }
      }

      if (publicUrl) {
        const now = new Date().toISOString();
        await supabase.from('messages').insert({
          conversation_id: activeConversation.id,
          sender_id: user.id,
          content: '(Image)',
          image_urls: [publicUrl],
        });
        await supabase
          .from('conversations')
          .update({ updated_at: now })
          .eq('id', activeConversation.id);
        setConversations((prev) => {
          const next = prev.map((c) =>
            c.id === activeConversation.id
              ? { ...c, lastMessage: 'Photo', lastMessageAt: now, updated_at: now }
              : c,
          );
          return next.sort(
            (a, b) =>
              new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
          );
        });
      }
    } catch (err) {
      console.error('[Messages] Image upload failed:', err);
    }

    setUploadingImage(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  useEffect(() => {
    if (!user) return;
    async function checkPush() {
      if (!isPushSupported()) return;
      const sub = await getSubscription();
      if (sub) {
        setPushEnabled(true);
        return;
      }
      if (Notification.permission === 'granted') {
        const ok = await setupPush();
        setPushEnabled(ok);
      }
    }
    checkPush();
  }, [user]);

  async function togglePush() {
    if (pushBusy) return;
    setPushBusy(true);
    try {
      if (pushEnabled) {
        await unsubscribeFromPush();
        setPushEnabled(false);
      } else {
        const ok = await setupPush();
        setPushEnabled(ok);
      }
    } finally {
      setPushBusy(false);
    }
  }

  const activeConv = activeConversation;

  return (
    <>
      <Helmet>
        <title>Messages — Drapé Collective</title>
      </Helmet>

      <div className="h-[calc(100dvh-4.5rem)] flex flex-col bg-surface">
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div
            className={`w-full lg:w-80 xl:w-96 border-r border-border flex flex-col bg-surface ${
              showMobileChat ? 'hidden lg:flex' : 'flex'
            }`}
          >
            <div className="px-4 sm:px-5 py-4 border-b border-border flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <h1 className="font-heading text-lg font-semibold text-charcoal-700">
                  Messages
                </h1>
                <p className="text-[11px] text-charcoal-300 mt-0.5">
                  Chat with designers
                </p>
              </div>
              {isPushSupported() && (
                <button
                  type="button"
                  onClick={togglePush}
                  disabled={pushBusy}
                  className={`p-2 rounded-full transition-colors cursor-pointer ${
                    pushEnabled
                      ? 'text-gold-600 bg-gold-50 hover:bg-gold-100'
                      : 'text-charcoal-300 hover:text-charcoal-500 hover:bg-ivory-100'
                  }`}
                  title={pushEnabled ? 'Mute notifications' : 'Enable notifications'}
                  aria-label={pushEnabled ? 'Mute notifications' : 'Enable notifications'}
                >
                  {pushEnabled ? <Bell size={16} /> : <BellOff size={16} />}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-3 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-xl animate-pulse"
                    >
                      <div className="w-11 h-11 rounded-full bg-ivory-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-2/3 bg-ivory-200 rounded" />
                        <div className="h-2.5 w-full bg-ivory-100 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <MessageCircle size={32} className="mx-auto mb-3 text-charcoal-200" />
                  <p className="text-sm font-medium text-charcoal-500">No conversations yet</p>
                  <p className="mt-1.5 text-xs text-charcoal-300 max-w-[220px] mx-auto leading-relaxed">
                    Open a product and tap Message designer to start a thread.
                  </p>
                  <Link
                    to="/explore"
                    className="inline-block mt-5 text-xs tracking-wide uppercase text-gold-600 hover:text-gold-700"
                  >
                    Explore pieces
                  </Link>
                </div>
              ) : (
                conversations.map((conv) => {
                  const isActive = activeConversation?.id === conv.id;
                  const otherName =
                    conv.otherUser?.brand_name ||
                    conv.otherUser?.username ||
                    'Designer';
                  const unread = unreadCounts[conv.id] ?? 0;
                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => handleSelectConversation(conv)}
                      className={`w-full text-left px-3 sm:px-4 py-3 flex items-start gap-3 transition-colors border-l-2 cursor-pointer ${
                        isActive
                          ? 'bg-ivory-50 border-l-gold-400'
                          : 'border-l-transparent hover:bg-ivory-50/70'
                      }`}
                    >
                      <Avatar
                        name={otherName}
                        url={conv.otherUser?.profile_photo_url}
                        size="w-11 h-11"
                      />
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-sm truncate ${
                              unread > 0
                                ? 'font-semibold text-charcoal-800'
                                : 'font-medium text-charcoal-700'
                            }`}
                          >
                            {otherName}
                          </p>
                          <span className="text-[10px] text-charcoal-300 shrink-0 tabular-nums">
                            {formatListTime(conv.lastMessageAt || conv.updated_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p
                            className={`text-xs truncate flex-1 ${
                              unread > 0 ? 'text-charcoal-600' : 'text-charcoal-400'
                            }`}
                          >
                            {conv.lastMessage || 'No messages yet'}
                          </p>
                          {unread > 0 && (
                            <span
                              className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-gold-500 text-white text-[10px] font-semibold"
                              aria-label={`${unread} unread`}
                            >
                              {unread > 9 ? '9+' : unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat pane */}
          <div
            className={`flex-1 flex flex-col bg-surface min-w-0 ${
              !showMobileChat ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {activeConv ? (
              <>
                <div className="flex items-center gap-3 px-3 sm:px-5 py-3 border-b border-border shrink-0">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="lg:hidden p-1.5 -ml-1 rounded-full hover:bg-ivory-100 text-charcoal-500 cursor-pointer"
                    aria-label="Back to conversations"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <Avatar
                    name={
                      activeConv.otherUser?.brand_name || activeConv.otherUser?.username
                    }
                    url={activeConv.otherUser?.profile_photo_url}
                    size="w-9 h-9"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-charcoal-700 truncate">
                      {activeConv.otherUser?.brand_name ||
                        activeConv.otherUser?.username ||
                        'Designer'}
                    </p>
                    {activeConv.otherUser?.location && (
                      <p className="text-[11px] text-charcoal-300 truncate">
                        {activeConv.otherUser.location}
                      </p>
                    )}
                  </div>
                  {activeConv.otherUser?.id && (
                    <Link
                      to={`/showroom/${activeConv.otherUser.id}`}
                      className="hidden sm:inline-flex text-[11px] tracking-wide uppercase text-charcoal-400 hover:text-gold-600 transition-colors"
                    >
                      Showroom
                    </Link>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 space-y-3">
                  {contextProduct && (
                    <div className="pb-2">
                      <ProductChip product={contextProduct} />
                    </div>
                  )}

                  {messages.length === 0 && !contextProduct && (
                    <div className="py-12 text-center">
                      <p className="text-xs text-charcoal-300">
                        Say hello — introduce yourself or ask about a piece.
                      </p>
                    </div>
                  )}

                  {messages.map((msg) => {
                    const isOutgoing = msg.sender_id === user!.id;
                    const isImageOnly =
                      msg.image_urls &&
                      msg.image_urls.length > 0 &&
                      (!msg.content || msg.content === '(Image)');
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className="max-w-[85%] sm:max-w-[70%]">
                          <div
                            className={`inline-block px-3.5 py-2.5 text-sm leading-relaxed ${
                              isOutgoing
                                ? 'bg-charcoal-700 text-white rounded-2xl rounded-br-md'
                                : 'bg-ivory-100 text-charcoal-700 rounded-2xl rounded-bl-md'
                            }`}
                          >
                            {msg.image_urls && msg.image_urls.length > 0 && (
                              <div className={`${isImageOnly ? '' : 'mb-2'} space-y-1.5`}>
                                {msg.image_urls.map((url, i) => (
                                  <div
                                    key={i}
                                    className="rounded-lg overflow-hidden bg-black/5 -mx-0.5"
                                  >
                                    <img
                                      src={url}
                                      alt="Attachment"
                                      className="w-full max-h-56 object-cover"
                                      loading="lazy"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                            {!isImageOnly && msg.content && <p>{msg.content}</p>}
                          </div>
                          <p
                            className={`mt-1 text-[10px] flex items-center gap-0.5 ${
                              isOutgoing
                                ? 'justify-end text-charcoal-300'
                                : 'justify-start text-charcoal-300'
                            }`}
                          >
                            <span>{formatTime(msg.created_at)}</span>
                            {isOutgoing && (
                              <TickStatus
                                is_read={!!msg.is_read}
                                status={msg.status || 'sent'}
                              />
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <div className="shrink-0 px-3 sm:px-5 py-3 border-t border-border bg-surface pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      sendMessage();
                    }}
                    className="flex items-center gap-1.5 bg-ivory-50 border border-border/80 rounded-2xl pl-2 pr-1.5 py-1.5 focus-within:border-gold-300/50 focus-within:ring-2 focus-within:ring-gold-200/40 transition-all"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      aria-label="Attach an image"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-charcoal-300 hover:text-charcoal-500 hover:bg-ivory-200 transition-all disabled:opacity-40 cursor-pointer"
                      aria-label="Attach image"
                    >
                      {uploadingImage ? (
                        <div className="w-4 h-4 border border-charcoal-300/30 border-t-charcoal-400 rounded-full animate-spin" />
                      ) : (
                        <Paperclip size={17} />
                      )}
                    </button>
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message…"
                      className="flex-1 bg-transparent text-sm text-charcoal-700 placeholder:text-charcoal-300/60 focus:outline-none min-w-0 py-2"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || uploadingImage}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-charcoal-700 text-white hover:bg-charcoal-800 active:scale-95 transition-all disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                      aria-label="Send message"
                    >
                      <Send size={15} />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center">
                <div>
                  <div className="w-14 h-14 rounded-full bg-ivory-100 flex items-center justify-center mx-auto mb-4">
                    <MessageCircle size={24} className="text-charcoal-300" />
                  </div>
                  <p className="text-sm font-medium text-charcoal-500">
                    Select a conversation
                  </p>
                  <p className="mt-1.5 text-xs text-charcoal-300 max-w-xs mx-auto">
                    Choose a thread on the left, or message a designer from any product page.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}