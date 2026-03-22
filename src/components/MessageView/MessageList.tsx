import { useEffect, useRef, useCallback, useState } from 'react'
import { useMessagesStore } from '@/stores/messages'
import { formatDate } from '@/lib/utils'
import MessageBubble from './MessageBubble'
import type { Message, Contact } from '@shared/types'

interface MessageListProps {
  accountId: string
  chatJid: string
  isGroup: boolean
  onRetryMessage?: (message: Message) => void
}

export default function MessageList({ accountId, chatJid, isGroup, onRetryMessage }: MessageListProps) {
  const messages = useMessagesStore((s) => s.messages)
  const loading = useMessagesStore((s) => s.loading)
  const hasMore = useMessagesStore((s) => s.hasMore)

  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isLoadingOlderRef = useRef(false)
  const initialScrollDone = useRef(false)

  // Cache sender contacts for avatars in groups
  const [senderContacts, setSenderContacts] = useState<Record<string, Contact | null>>({})

  // Load sender contact info for group messages
  useEffect(() => {
    if (!isGroup) return
    const unknownSenders = new Set<string>()
    for (const msg of messages) {
      if (!msg.isFromMe && msg.senderJid && msg.senderJid.includes('@') && !senderContacts[msg.senderJid]) {
        unknownSenders.add(msg.senderJid)
      }
    }
    if (unknownSenders.size === 0) return

    Promise.all(
      Array.from(unknownSenders).map(jid =>
        window.api.invoke('contact:get', { accountId, jid }).then(c => [jid, c] as const).catch(() => [jid, null] as const)
      )
    ).then(results => {
      const updates: Record<string, Contact | null> = {}
      for (const [jid, contact] of results) {
        updates[jid] = contact
      }
      setSenderContacts(prev => ({ ...prev, ...updates }))
    })
  }, [accountId, isGroup, messages.length])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isLoadingOlderRef.current) {
      isLoadingOlderRef.current = false
      return
    }
    bottomRef.current?.scrollIntoView({ behavior: initialScrollDone.current ? 'smooth' : 'auto' })
    initialScrollDone.current = true
  }, [messages.length])

  // Reset on chat change
  useEffect(() => {
    initialScrollDone.current = false
    setSenderContacts({})
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' })
    }, 50)
  }, [chatJid])

  // Load older messages on scroll to top
  const handleScroll = useCallback(async () => {
    const el = scrollRef.current
    if (!el || loading || !hasMore) return

    if (el.scrollTop < 150) {
      const oldestMessage = messages[0]
      if (!oldestMessage) return

      isLoadingOlderRef.current = true
      useMessagesStore.getState().setLoading(true)
      const prevScrollHeight = el.scrollHeight

      try {
        const olderMessages = await window.api.invoke('chat:load', {
          accountId,
          jid: chatJid,
          before: oldestMessage.timestamp,
          limit: 50,
        })

        if (olderMessages.length < 50) {
          useMessagesStore.getState().setHasMore(false)
        }

        if (olderMessages.length > 0) {
          useMessagesStore.getState().prependMessages(olderMessages)
          requestAnimationFrame(() => {
            if (el) el.scrollTop = el.scrollHeight - prevScrollHeight
          })
        }
      } catch (err) {
        console.error('Failed to load older messages:', err)
      } finally {
        useMessagesStore.getState().setLoading(false)
      }
    }
  }, [accountId, chatJid, loading, hasMore, messages])

  // Group messages by date
  const groupedMessages: { date: string; messages: typeof messages }[] = []
  let currentDate = ''
  for (const msg of messages) {
    const date = formatDate(msg.timestamp)
    if (date !== currentDate) {
      currentDate = date
      groupedMessages.push({ date, messages: [msg] })
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg)
    }
  }

  // Check if sender changed (to show avatar only on first message of a group)
  function shouldShowAvatar(msg: Message, idx: number, group: Message[]): boolean {
    if (msg.isFromMe || !isGroup) return false
    if (idx === 0) return true
    return group[idx - 1].senderJid !== msg.senderJid || group[idx - 1].isFromMe
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto scrollbar-thin"
    >
      {/* Load more indicator */}
      {hasMore && (
        <div className="flex justify-center py-3">
          {loading ? (
            <div className="w-5 h-5 border-2 border-accent-purple border-t-transparent animate-spin" />
          ) : (
            <button
              onClick={handleScroll}
              className="text-[10px] text-accent-purple font-mono uppercase font-bold border border-accent-purple px-3 py-1 hover:bg-accent-purple hover:text-white cursor-pointer"
            >
              LOAD OLDER MESSAGES
            </button>
          )}
        </div>
      )}

      {/* Date-grouped messages */}
      {groupedMessages.map((group) => (
        <div key={group.date}>
          <div className="flex items-center py-3 px-4">
            <div className="flex-1 h-[2px] bg-border-secondary" />
            <span className="text-[10px] text-text-secondary font-mono font-bold uppercase tracking-widest px-4">
              {group.date}
            </span>
            <div className="flex-1 h-[2px] bg-border-secondary" />
          </div>

          {group.messages.map((msg) => {
            const isIncomingGroup = isGroup && !msg.isFromMe
            const senderContact = msg.senderJid ? senderContacts[msg.senderJid] : null

            return (
              <MessageBubble
                key={msg.id}
                message={msg}
                showSender={isIncomingGroup}
                showAvatar={isIncomingGroup}
                senderAvatarPath={senderContact?.profilePicturePath}
                onRetry={onRetryMessage}
              />
            )
          })}
        </div>
      ))}

      {/* Empty state */}
      {messages.length === 0 && !loading && (
        <div className="flex items-center justify-center h-full">
          <span className="text-text-muted text-sm font-mono uppercase">NO MESSAGES YET</span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
