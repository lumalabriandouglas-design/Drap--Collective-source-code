import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Tables } from '../types/supabase';
import type { RealtimePostgresChangesPayload, RealtimeChannel } from '@supabase/supabase-js';

type Profile = Tables<'profiles'>;
type Conversation = Tables<'conversations'>;
type Message = Tables<'messages'>;

export interface ConversationWithProfiles extends Conversation {
  participants: Profile[];
  last_message?: Message;
  unread_count: number;
}

export interface UseMessagingReturn {
  conversations: ConversationWithProfiles[];
  loadingConversations: boolean;
  activeConversation: ConversationWithProfiles | null;
  messages: Message[];
  loadingMessages: boolean;
  sending: boolean;
  typingUsers: string[];
  selectConversation: (conv: ConversationWithProfiles) => void;
  sendMessage: (content: string, images?: File[]) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  startConversation: (designerId: string) => Promise<string | null>;
  setTyping: (typing: boolean) => void;
  hasMoreMessages: boolean;
  unreadTotal: number;
}

const MESSAGES_PAGE_SIZE = 30;

export function useMessaging(): UseMessagingReturn {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithProfiles[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [activeConversation, setActiveConversation] = useState<ConversationWithProfiles | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;
  const activeConvIdRef = useRef(activeConversation?.id);
  activeConvIdRef.current = activeConversation?.id;
  const fetchConversationsRef = useRef<() => Promise<void>>();
  const initialFetchDone = useRef(false);

  // ───── Fetch conversations ─────
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoadingConversations(true);

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .contains('participant_ids', [user.id])
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('fetchConversations error:', error);
      setConversations([]);
      setLoadingConversations(false);
      return;
    }

    // Fetch profiles for all participants + last message + unread counts
    const enriched = await Promise.all(
      (data ?? []).map(async (conv) => {
        const participantIds = conv.participant_ids.filter((id: string) => id !== user.id);

        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', participantIds);

        // Get last message
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Get unread count
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .neq('sender_id', user.id)
          .is('read_at', null);

        return {
          ...conv,
          participants: profiles ?? [],
          last_message: lastMsg ?? undefined,
          unread_count: count ?? 0,
        } as ConversationWithProfiles;
      })
    );

    setConversations(enriched);
    setUnreadTotal(enriched.reduce((sum, c) => sum + c.unread_count, 0));
    setLoadingConversations(false);
  }, [user]);

  // ───── Fetch messages ─────
  const fetchMessages = useCallback(async (conversationId: string, before?: string) => {
    setLoadingMessages(true);
    let query = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(MESSAGES_PAGE_SIZE);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;
    if (error) {
      console.error('fetchMessages error:', error);
      setLoadingMessages(false);
      return;
    }

    setMessages((prev) => {
      const existing = before ? prev : [];
      const newMsgs = (data ?? []).reverse();
      const ids = new Set(existing.map((m) => m.id));
      const merged = [...newMsgs.filter((m) => !ids.has(m.id)), ...existing];
      return merged;
    });
    setHasMoreMessages((data ?? []).length >= MESSAGES_PAGE_SIZE);
    setLoadingMessages(false);
  }, []);

  // ───── Select conversation ─────
  const selectConversation = useCallback(
    (conv: ConversationWithProfiles) => {
      setActiveConversation(conv);
      setMessages([]);
      setHasMoreMessages(true);
      fetchMessages(conv.id);

      // Mark messages as read — update read_at (is_read is a generated column, so it updates automatically)
      supabase
        .from('messages')
        .update({
          read_at: new Date().toISOString(),
        })
        .eq('conversation_id', conv.id)
        .neq('sender_id', user?.id)
        .is('read_at', null)
        .then(({ error }) => {
          if (error) {
            console.error('[useMessaging] Error marking messages as read:', error);
          }
          fetchConversations();
        });
    },
    [fetchMessages, fetchConversations, user]
  );

  // ───── Load more messages (pagination) ─────
  const loadMoreMessages = useCallback(async () => {
    if (!activeConversation || !hasMoreMessages) return;
    const oldest = messages[0];
    if (!oldest) return;
    await fetchMessages(activeConversation.id, oldest.created_at);
  }, [activeConversation, hasMoreMessages, messages, fetchMessages]);

  // ───── Send message ─────
  const sendMessage = useCallback(
    async (content: string, images?: File[]) => {
      if ((!content.trim() && (!images || images.length === 0)) || !activeConversation || !user) return;
      setSending(true);

      let imageUrls: string[] | null = null;

      // Upload images if any
      if (images && images.length > 0) {
        const urls: string[] = [];
        for (const img of images) {
          // Compress
          try {
            const imageCompression = (await import('browser-image-compression')).default;
            const compressed = await imageCompression(img, {
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

            if (!uploadError) {
              const { data: urlData } = supabase.storage
                .from('message-attachments')
                .getPublicUrl(filePath);
              urls.push(urlData.publicUrl);
            }
          } catch {
            // Fallback: upload original
            const ext = img.name.split('.').pop() || 'jpg';
            const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
            const filePath = `${activeConversation.id}/${fileName}`;
            const { error: uploadError } = await supabase.storage
              .from('message-attachments')
              .upload(filePath, img);
            if (!uploadError) {
              const { data: urlData } = supabase.storage
                .from('message-attachments')
                .getPublicUrl(filePath);
              urls.push(urlData.publicUrl);
            }
          }
        }
        imageUrls = urls.length > 0 ? urls : null;
      }

      const { error } = await supabase.from('messages').insert({
        conversation_id: activeConversation.id,
        sender_id: user.id,
        content: content.trim() || '(Image)',
        image_urls: imageUrls,
      });

      if (!error) {
        // Update conversation updated_at
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', activeConversation.id);

        fetchConversations();
      }

      setSending(false);
    },
    [activeConversation, user, fetchConversations]
  );

  // ───── Start a new conversation (server-side check to prevent duplicates) ─────
  const startConversation = useCallback(
    async (designerId: string): Promise<string | null> => {
      if (!user) return null;

      // ── Server-side check: query DB for an existing conversation ──
      const { data: existingRows, error: lookupError } = await supabase
        .from('conversations')
        .select('*')
        .contains('participant_ids', [user.id, designerId]);

      if (lookupError) {
        console.error('startConversation lookup error:', lookupError);
        return null;
      }

      if (existingRows && existingRows.length > 0) {
        // Conversation already exists — build enriched and select it
        const conv = existingRows[0];
        const otherId = conv.participant_ids.find((id: string) => id !== user.id);
        let participants: Profile[] = [];
        if (otherId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', otherId)
            .single();
          if (profile) participants = [profile];
        }

        // Get unread count
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .neq('sender_id', user.id)
          .is('read_at', null);

        const enriched: ConversationWithProfiles = {
          ...conv,
          participants,
          unread_count: count ?? 0,
        };

        selectConversation(enriched);
        return conv.id;
      }

      // ── No existing conversation — create it ──
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          participant_ids: [user.id, designerId],
        })
        .select()
        .single();

      if (error || !data) {
        console.error('startConversation insert error:', error);
        return null;
      }

      // Refresh conversation list in background
      fetchConversations();

      // Build the enriched conversation manually
      const otherId = data.participant_ids.find((id: string) => id !== user.id);
      let participants: Profile[] = [];
      if (otherId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', otherId)
          .single();
        if (profile) participants = [profile];
      }

      const enriched: ConversationWithProfiles = {
        ...data,
        participants,
        unread_count: 0,
      };

      selectConversation(enriched);
      return data.id;
    },
    [user, selectConversation, fetchConversations]
  );

  // ───── Typing indicator — send via stable broadcast channel ─────
  const setTyping = useCallback(
    (typing: boolean) => {
      if (!activeConversation || !user || !typingChannelRef.current) return;

      if (typing) {
        typingChannelRef.current.send({
          type: 'broadcast',
          event: 'typing:start',
          payload: { userId: user.id },
        });
      } else {
        typingChannelRef.current.send({
          type: 'broadcast',
          event: 'typing:stop',
          payload: { userId: user.id },
        });
      }
    },
    [activeConversation, user]
  );

  // ───── Realtime: listen for new messages ─────
  // Uses refs for reactive values so the effect never needs to re-run.
  // Only re-subscribes when user changes.
  // Scoped to INSERT on messages table with client-side filtering
  // to ensure the user only sees messages from their conversations.
  useEffect(() => {
    if (!user) return;

    console.log('[useMessaging] Subscribing to Realtime messages channel...');

    const channel: RealtimeChannel = supabase
      .channel('messages:global')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload: RealtimePostgresChangesPayload<Message>) => {
          const newMsg = payload.new as Message;
          const currentConvs = conversationsRef.current;
          const currentActiveId = activeConvIdRef.current;

          // 🎯 Scope check: Only process if user is a participant
          // in this message's conversation
          const conv = currentConvs.find((c) => c.id === newMsg.conversation_id);
          if (!conv) {
            // The message might be from a conversation we haven't fetched yet,
            // so refresh the conversation list to pick it up
            fetchConversationsRef.current?.();
            return;
          }

          console.log(
            `[useMessaging] New message received in conversation ${newMsg.conversation_id}, from ${newMsg.sender_id}`
          );

          // Update active conversation messages in real time
          if (currentActiveId === newMsg.conversation_id && newMsg.sender_id !== user.id) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }

          // Refresh conversation list to update last_message and unread count
          fetchConversationsRef.current?.();
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[useMessaging] Realtime subscription established successfully');
        } else if (status === 'CHANNEL_ERROR') {
          // Transport failures are transient and auto-recovered by the SDK —
          // log at warn level to reduce noise in preview environments
          if (err) {
            console.warn('[useMessaging] Realtime channel error (auto-reconnect):', err);
          }
        } else if (status === 'TIMED_OUT') {
          console.warn('[useMessaging] Realtime subscription timed out — retrying...');
        } else if (status === 'CLOSED') {
          console.log('[useMessaging] Realtime channel closed');
        }
      });

    return () => {
      console.log('[useMessaging] Unsubscribing from Realtime messages channel');
      channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Keep the fetchConversationsRef in sync
  fetchConversationsRef.current = fetchConversations;

  // ───── Realtime: listen for typing on active conversation ─────
  // Uses a stable broadcast channel so both send and receive share the same subscription.
  // The sender-side 2s debounce is handled in MessagesPage.handleInputChange.
  // Receiver auto-clears after 3s as a fallback in case typing:stop is missed.
  useEffect(() => {
    if (!activeConversation || !user) {
      setTypingUsers([]);
      return;
    }

    const channel = supabase.channel(`typing:${activeConversation.id}`, {
      config: { broadcast: { self: true } },
    });

    channel
      .on('broadcast', { event: 'typing:start' }, (payload) => {
        if (payload.payload.userId !== user.id) {
          setTypingUsers([payload.payload.userId]);
          // Reset the auto-clear timer
          if (typingClearTimerRef.current) clearTimeout(typingClearTimerRef.current);
          typingClearTimerRef.current = setTimeout(() => {
            setTypingUsers([]);
          }, 3000);
        }
      })
      .on('broadcast', { event: 'typing:stop' }, (payload) => {
        if (payload.payload.userId !== user.id) {
          setTypingUsers([]);
          if (typingClearTimerRef.current) clearTimeout(typingClearTimerRef.current);
          typingClearTimerRef.current = null;
        }
      })
      .subscribe();

    typingChannelRef.current = channel;

    return () => {
      if (typingClearTimerRef.current) clearTimeout(typingClearTimerRef.current);
      channel.unsubscribe();
      typingChannelRef.current = null;
    };
  }, [activeConversation, user]);

  // ───── Initial fetch — runs exactly once when user becomes available ─────
  useEffect(() => {
    if (!user) {
      setConversations([]);
      setActiveConversation(null);
      setMessages([]);
      setUnreadTotal(0);
      initialFetchDone.current = false;
      return;
    }

    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchConversations();
    }
  }, [user, fetchConversations]);

  return {
    conversations,
    loadingConversations,
    activeConversation,
    messages,
    loadingMessages,
    sending,
    typingUsers,
    selectConversation,
    sendMessage,
    loadMoreMessages,
    startConversation,
    setTyping,
    hasMoreMessages,
    unreadTotal,
  };
}