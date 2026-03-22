import { useState, useEffect, useCallback } from 'react'
import { formatTime, truncate } from '@/lib/utils'
import type { Message } from '@shared/types'

interface StarredMessagesProps {
  accountId: string
  onClose: () => void
}

export default function StarredMessages({ accountId, onClose }: StarredMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  const loadStarred = useCallback(async () => {
    try {
      setLoading(true)
      const starred = await window.api.invoke('message:getStarred', { accountId })
      setMessages(starred)
    } catch (err) {
      console.error('Failed to load starred messages:', err)
    } finally {
      setLoading(false)
    }
  }, [accountId])

  useEffect(() => {
    loadStarred()
  }, [loadStarred])

  const handleToggleStar = useCallback(
    async (messageId: string) => {
      try {
        await window.api.invoke('message:star', { accountId, messageId, starred: false })
        setMessages((prev) => prev.filter((m) => m.id !== messageId))
      } catch (err) {
        console.error('Failed to unstar message:', err)
      }
    },
    [accountId]
  )

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-80 h-full bg-bg-secondary border-l border-border-primary overflow-y-auto scrollbar-thin">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-bg-secondary border-b border-border-primary px-4 py-3 flex items-center gap-3">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="1" y1="1" x2="13" y2="13" />
              <line x1="13" y1="1" x2="1" y2="13" />
            </svg>
          </button>
          <h2 className="text-sm font-semibold text-text-primary">Starred Messages</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span className="text-sm text-text-muted">No starred messages</span>
          </div>
        ) : (
          <div className="divide-y divide-border-primary">
            {messages.map((msg) => (
              <div key={msg.id} className="px-4 py-3 hover:bg-bg-tertiary transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-text-muted">
                        {msg.chatJid.split('@')[0]}
                      </span>
                      <span className="text-[9px] text-text-muted">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-text-primary mt-0.5">
                      {msg.content ? truncate(msg.content, 120) : `[${msg.type}]`}
                    </p>
                    <span className="text-[9px] text-text-muted">
                      {msg.isFromMe ? 'You' : msg.senderJid?.split('@')[0] || 'Unknown'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleToggleStar(msg.id)}
                    className="shrink-0 w-6 h-6 flex items-center justify-center text-yellow-400 hover:text-text-muted transition-colors cursor-pointer"
                    title="Unstar message"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
