import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  Image as ImageIcon,
  X,
  ExternalLink,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import {
  isPushSupported,
  setupPush,
  unsubscribeFromPush,
  getSubscription,
} from '../../lib/pushNotifications';

/* ───────── Avatar helper ───────── */
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

/* ───────── Tick status ───────── */
function TickStatus({ is_read, status }: { is_read: boolean; status: string }) {
  if (is_read || status === 'read') {
    return (
      <span className="inline-flex items-center gap-[1px] ml-1.5">
        <CheckCheck size={13} className="text-gold-400" strokeWidth={2.5} />
      </span>
    );
  }
  if (status === 'delivered') {
    return (
      <span className="inline-flex items-center gap-[1px] ml-1.5">
        <CheckCheck size={13} className="text-charcoal-300/60" strokeWidth={2.5} />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center ml-1.5">
      <Check size={13} className="text-charcoal-300/40" strokeWidth={2.5} />
    </span>
  );
}

/* ───────── Timestamp formatter ───────── */
function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const time = d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (sameDay) return time;

  const date = d.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
  return `${date} ${time}`;
}

/* ───────── Product Reference Card ───────── */
function ProductReferenceCard({ product }: { product: Product }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-gold-200/50 bg-gold-50/40 max-w-sm">
      <div className="w-14 h-16 rounded-lg overflow-hidden bg-ivory-200 flex-shrink-0">
        <img
          src={product.image_urls?.[0] || ''}
          alt={product.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-charcoal-700 truncate">{product.name}</p>
        {product.price != null && (
          <p className="text-xs text-gold-600 mt-0.5 font-medium">
            {new Intl.NumberFormat('en-UG', {
              style: 'currency',
              currency: 'UGX',
              maximumFractionDigits: 0,
            }).format(product.price)}
          </p>
        )}
        <button
          onClick={() => navigate(`/product/${product.id}`)}
          className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-charcoal-400 hover:text-primary transition-colors"
        >
          <ExternalLink size={10} /> View Piece
        </button>
      </div>
    </div>
  );
}

/* ───────── Main Messages Page ───────── */
export default function Messages() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<
    (Conversation & { otherUser?: Profile })[]
  >([]);
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [pushEnabled, setPushEnabled] = useState(false);
  const [showPushBanner, setShowPushBanner] = useState(false);
  const [contextProduct, setContextProduct] = useState<Product | null>(null);
  const contextInjectedRef = useRef(false);

  useEffect(() => {
    if (user) loadConversations();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ── Load context product if ?product= param present ── */
  useEffect(() => {
    const productId = searchParams.get('product');
    if (!productId) return;
    supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()
      .then(({ data }) => {
        if (data) setContextProduct(data as Product);
      });
  }, [searchParams]);

  /* ── Realtime message subscription ── */
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
          setMessages((prev) => [...prev, msg]);
          if (msg.sender_id !== user.id) {
            supabase
              .from('messages')
              .update({ read_at: new Date().toISOString(), status: 'read', is_read: true })
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

  async function loadConversations() {
    setLoading(true);
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .contains('participant_ids', [user!.id])
      .order('updated_at', { ascending: false });
    const convs = data || [];
    const withUsers = await Promise.all(
      convs.map(async (conv) => {
        const otherId = conv.participant_ids.find((id) => id !== user!.id);
        if (otherId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', otherId)
            .single();
          return { ...conv, otherUser: profile || undefined };
        }
        return conv;
      }),
    );
    setConversations(withUsers);
    setLoading(false);

    // Fetch unread counts
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
        countMap[m.conversation_id] =
          (countMap[m.conversation_id] || 0) + 1;
      });
      setUnreadCounts(countMap);
    }

    // Handle designer param
    const designerId = searchParams.get('designer');
    if (designerId) {
      const existing = withUsers.find((c) =>
        c.participant_ids.includes(designerId),
      );
      if (existing) {
        setActiveConversation(existing);
        loadMessages(existing.id);
        setShowMobileChat(true);
      } else if (user) {
        // Create a new conversation with the designer
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({
            participant_ids: [user.id, designerId],
          })
          .select()
          .single();

        if (newConv) {
          const otherId = newConv.participant_ids.find((id) => id !== user.id);
          let otherProfile: Profile | undefined;
          if (otherId) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', otherId)
              .single();
            otherProfile = profile || undefined;
          }
          const enriched = { ...newConv, otherUser: otherProfile };
          setConversations((prev) => [enriched, ...prev]);
          setActiveConversation(enriched);
          setShowMobileChat(true);

          // Don't auto-insert — the product reference card renders above
        }
      }
    } else if (withUsers.length > 0 && !activeConversation) {
      setActiveConversation(withUsers[0]);
      loadMessages(withUsers[0].id);
    }
  }

  async function loadMessages(conversationId: string) {
    // Mark sent as delivered
    await supabase
      .from('messages')
      .update({ status: 'delivered' })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user!.id)
      .eq('status', 'sent');

    // Mark unread as read
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString(), status: 'read', is_read: true })
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

  function handleSelectConversation(conv: Conversation & { otherUser?: Profile }) {
    setActiveConversation(conv);
    loadMessages(conv.id);
    setShowMobileChat(true);
    setUnreadCounts((prev) => ({ ...prev, [conv.id]: 0 }));
    contextInjectedRef.current = true; // Prevent injection on manual selection
  }

  function handleBack() {
    setShowMobileChat(false);
  }

  async function sendMessage() {
    if (!user || !activeConversation || !newMessage.trim()) return;
    const { error } = await supabase.from('messages').insert({
      conversation_id: activeConversation.id,
      sender_id: user.id,
      content: newMessage.trim(),
    });
    if (!error) {
      setNewMessage('');
      // bump updated_at so conversation rises to top
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', activeConversation.id);
    }
  }

  /* ── Upload image attachment ── */
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user || !activeConversation) return;

    setUploadingImage(true);

    try {
      // Compress
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
        // Fallback: upload original
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
        await supabase.from('messages').insert({
          conversation_id: activeConversation.id,
          sender_id: user.id,
          content: '(Image)',
          image_urls: [publicUrl],
        });
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', activeConversation.id);
      }
    } catch (err) {
      console.error('[Messages] Image upload failed:', err);
    }

    setUploadingImage(false);
    // Reset so the same file can be picked again
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  /* ── Push notification setup ── */
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
      } else if (Notification.permission === 'default') {
        setShowPushBanner(true);
      }
    }

    checkPush();
  }, [user]);

  async function handleEnablePush() {
    const ok = await setupPush();
    setPushEnabled(ok);
    setShowPushBanner(false);
  }

  async function handleDisablePush() {
    await unsubscribeFromPush();
    setPushEnabled(false);
  }

  const activeConv = activeConversation as (Conversation & { otherUser?: Profile }) | null;

  return (
    <>
      <Helmet>
        <title>Messages — Drapé Collective</title>
      </Helmet>
      {/*
        dvh-based height ensures proper viewport fit on mobile (addresses
        browser chrome collapsing/expanding). The 5rem accounts for the
        fixed navbar (h-16 = 64px ~ 4rem) plus 1rem safe buffer.
      */}
      <div className="h-[calc(100dvh-5rem)] flex flex-col">
        {/* ════ Push notification banner ════ */}
        {showPushBanner && (
          <div className="shrink-0 px-4 py-3 sm:px-6 bg-gold-50 border-b border-gold-200/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Bell size={16} className="text-gold-500 shrink-0" />
              <p className="text-xs sm:text-sm text-charcoal-600">
                Get notified when designers reply — enable push notifications
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleEnablePush}
                className="text-xs font-medium px-3 py-1.5 rounded-full bg-gold-500 text-white hover:bg-gold-600 active:scale-95 transition-all duration-200 cursor-pointer"
              >
                Enable
              </button>
              <button
                onClick={() => setShowPushBanner(false)}
                className="text-xs text-charcoal-400 hover:text-charcoal-600 transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {pushEnabled && (
          <div className="shrink-0 px-4 py-2 sm:px-6 bg-ivory-50/80 border-b border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={13} className="text-green-600" />
              <span className="text-[11px] text-charcoal-400">
                Push notifications active
              </span>
            </div>
            <button
              onClick={handleDisablePush}
              className="flex items-center gap-1 text-[11px] text-charcoal-300 hover:text-charcoal-500 transition-colors cursor-pointer"
              aria-label="Disable push notifications"
            >
              <BellOff size={12} />
              <span>Mute</span>
            </button>
          </div>
        )}

        {/* ════ Main layout ════ */}
        <div className="flex flex-1 min-h-0">
          {/* ════ Sidebar ════ */}
          <div
            className={`w-full lg:w-80 xl:w-96 border-r border-border flex flex-col bg-surface ${
              showMobileChat ? 'hidden lg:flex' : 'flex'
            }`}
          >
            <div className="p-4 sm:p-5 border-b border-border">
              <h2 className="font-heading text-lg font-semibold text-charcoal-700">
                Messages
              </h2>
              <p className="text-xs text-charcoal-300 mt-0.5">
                Connect with designers
              </p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-xl bg-ivory-50 animate-pulse"
                    >
                      <div className="w-10 h-10 rounded-full bg-ivory-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-3/4 bg-ivory-200 rounded" />
                        <div className="h-2 w-1/2 bg-ivory-200 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-sm text-charcoal-300">
                  <MessageCircle
                    size={36}
                    className="mx-auto mb-3 text-charcoal-200"
                  />
                  <p className="font-medium text-charcoal-400">
                    No conversations yet
                  </p>
                  <p className="mt-1 text-xs">
                    Message a designer from a product page
                  </p>
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
                      onClick={() => handleSelectConversation(conv)}
                      className={`w-full text-left p-3 sm:p-4 flex items-center gap-3 transition-all duration-200 border-l-2 cursor-pointer ${
                        isActive
                          ? 'bg-ivory-50 border-l-gold-400'
                          : 'border-l-transparent hover:bg-ivory-50/50'
                      }`}
                    >
                      <Avatar
                        name={otherName}
                        url={conv.otherUser?.profile_photo_url}
                        size="w-11 h-11 sm:w-12 sm:h-12"
                      />
                      <div className="min-w-0 flex-1 flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-charcoal-700 truncate">
                            {otherName}
                          </p>
                          {conv.otherUser?.location && (
                            <p className="text-[11px] text-charcoal-300 truncate mt-0.5">
                              {conv.otherUser.location}
                            </p>
                          )}
                        </div>
                        {unread > 0 && (
                          <span
                            className="inline-flex items-center justify-center w-5 h-5 min-w-5 rounded-full bg-gold-500 text-white text-[10px] font-semibold leading-none shadow-[0_2px_6px_rgba(201,169,110,0.35)]"
                            aria-label={`${unread} unread message${unread !== 1 ? 's' : ''}`}
                          >
                            {unread > 9 ? '9+' : unread}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ════ Chat area ════ */}
          <div
            className={`flex-1 flex flex-col bg-surface ${
              !showMobileChat ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {activeConv ? (
              <>
                {/* ── Chat header ── */}
                <div className="flex items-center gap-3 px-4 py-3 sm:px-6 sm:py-4 border-b border-border shrink-0">
                  <button
                    onClick={handleBack}
                    className="lg:hidden p-1 -ml-1 rounded-full hover:bg-ivory-100 transition-colors text-charcoal-500 cursor-pointer"
                    aria-label="Back to conversations"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <Avatar
                    name={
                      activeConv.otherUser?.brand_name ||
                      activeConv.otherUser?.username
                    }
                    url={activeConv.otherUser?.profile_photo_url}
                    size="w-9 h-9 sm:w-10 sm:h-10"
                  />
                  <div className="min-w-0">
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
                </div>

                {/* ── Messages ── */}
                <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-5">
                  {/* Context product reference card — shown persistently when user navigated from a product page */}
                  {contextProduct && (
                    <div className="flex justify-start">
                      <div>
                        <div className="inline-block px-4 py-3 bg-ivory-100 text-charcoal-700 rounded-2xl rounded-bl-none text-sm">
                          <p className="text-[11px] text-charcoal-400 mb-2 font-medium tracking-wide uppercase">
                            Inquiring about
                          </p>
                          <ProductReferenceCard product={contextProduct} />
                        </div>
                        <p className="mt-1 text-[11px] text-charcoal-300/70 pl-1">
                          {formatTime(new Date().toISOString())}
                        </p>
                      </div>
                    </div>
                  )}

                  {messages.map((msg) => {
                    const isOutgoing = msg.sender_id === user!.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className="max-w-[85%] sm:max-w-[75%] lg:max-w-[65%]">
                          {/* Bubble */}
                          <div
                            className={`inline-block px-4 py-3 text-sm leading-relaxed ${
                              isOutgoing
                                ? 'bg-charcoal-700 text-white rounded-2xl rounded-br-none'
                                : 'bg-ivory-100 text-charcoal-700 rounded-2xl rounded-bl-none'
                            }`}
                          >
                            {/* Render image attachment if present */}
                            {msg.image_urls && msg.image_urls.length > 0 && (
                              <div className="-mx-1 -mt-1 mb-2 space-y-2">
                                {msg.image_urls.map((url, i) => (
                                  <div
                                    key={i}
                                    className="rounded-lg overflow-hidden bg-black/5"
                                  >
                                    <img
                                      src={url}
                                      alt="Attached image"
                                      className="w-full max-h-64 object-cover rounded-lg"
                                      loading="lazy"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                            <p className="inline">{msg.content}</p>
                          </div>
                          {/* Timestamp + Tick status */}
                          <p
                            className={`mt-1 text-[11px] tracking-wide flex items-center ${
                              isOutgoing ? 'justify-end pr-1' : 'justify-start pl-1'
                            } text-charcoal-300/70`}
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

                {/* ── Input bar — locked at bottom ── */}
                <div className="shrink-0 px-3 sm:px-6 py-3 sm:py-4 border-t border-border bg-surface">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      sendMessage();
                    }}
                    className="flex items-center gap-2 bg-ivory-50 border border-border/80 rounded-2xl pl-3 pr-2 py-2 focus-within:border-gold-300/50 focus-within:shadow-[0_0_0_2px_rgba(201,169,110,0.12)] transition-all duration-300"
                  >
                    {/* Hidden file input for image attachment */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      aria-label="Attach an image"
                    />

                    {/* Paperclip / media attachment button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-charcoal-300 hover:text-charcoal-500 hover:bg-ivory-200 transition-all duration-200 disabled:opacity-40 cursor-pointer"
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
                      placeholder="Type a message..."
                      className="flex-1 bg-transparent text-sm text-charcoal-700 placeholder:text-charcoal-300/50 focus:outline-none min-w-0"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || uploadingImage}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-charcoal-700 text-white hover:bg-charcoal-800 active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      aria-label="Send message"
                    >
                      <Send size={15} />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              /* ── Empty state ── */
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <div>
                  <MessageCircle
                    size={48}
                    className="mx-auto text-charcoal-200 mb-4"
                  />
                  <p className="text-sm text-charcoal-300">
                    Select a conversation to start chatting
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
