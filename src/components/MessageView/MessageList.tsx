import { useEffect, useRef, useCallback } from 'react'
import { useMessagesStore } from '@/stores/messages'
import { formatDate } from '@/lib/utils'
import MessageBubble from './MessageBubble'
import type { Message } from '@shared/types'

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
  const prependMessages = useMessagesStore((s) => s.prependMessages)
  const setLoading = useMessagesStore((s) => s.setLoading)
  const setHasMore = useMessagesStore((s) => s.setHasMore)

  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevMessageCountRef = useRef(0)
  const isLoadingOlderRef = useRef(false)

  // Auto-scroll to bottom on new messages (only if near bottom)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    // If we loaded older messages (prepend), preserve scroll position
    if (isLoadingOlderRef.current) {
      isLoadingOlderRef.current = false
      return
    }

    // Auto-scroll to bottom
    bottomRef.current?.scrollIntoView({ behavior: messages.length <= 50 ? 'auto' : 'smooth' })
  }, [messages.length])

  // Initial scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [chatJid])

  // Load older messages on scroll to top
  const handleScroll = useCallback(async () => {
    const el = scrollRef.current
    if (!el || loading || !hasMore) return

    if (el.scrollTop < 100) {
      const oldestMessage = messages[0]
      if (!oldestMessage) return

      isLoadingOlderRef.current = true
      setLoading(true)
      const prevScrollHeight = el.scrollHeight

      try {
        const olderMessages = await window.api.invoke('chat:load', {
          accountId,
          jid: chatJid,
          before: oldestMessage.timestamp,
          limit: 50,
        })

        if (olderMessages.length < 50) {
          setHasMore(false)
        }

        if (olderMessages.length > 0) {
          prependMessages(olderMessages)
          // Preserve scroll position after prepend
          requestAnimationFrame(() => {
            if (el) {
              el.scrollTop = el.scrollHeight - prevScrollHeight
            }
          })
        }
      } catch (err) {
        console.error('Failed to load older messages:', err)
      } finally {
        setLoading(false)
      }
    }
  }, [accountId, chatJid, loading, hasMore, messages, prependMessages, setLoading, setHasMore])

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

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto scrollbar-thin"
    >
      {/* Loading indicator for older messages */}
      {loading && (
        <div className="flex justify-center py-3">
          <div className="w-5 h-5 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Date-grouped messages */}
      {groupedMessages.map((group) => (
        <div key={group.date}>
          {/* Date divider */}
          <div className="flex justify-center py-3">
            <span className="text-[11px] text-text-secondary bg-bg-tertiary/80 px-4 py-1 rounded-md shadow-sm">
              {group.date}
            </span>
          </div>

          {/* Messages */}
          {group.messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              showSender={isGroup}
              onRetry={onRetryMessage}
            />
          ))}
        </div>
      ))}

      {/* Empty state */}
      {messages.length === 0 && !loading && (
        <div className="flex items-center justify-center h-full">
          <span className="text-text-muted text-sm">No messages yet</span>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  )
}
