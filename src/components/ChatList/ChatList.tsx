import { useCallback, useRef, useState, useEffect } from 'react'
import { FixedSizeList as List } from 'react-window'
import { useChatsStore } from '@/stores/chats'
import { useMessagesStore } from '@/stores/messages'
import ChatListHeader from './ChatListHeader'
import ChatListItem from './ChatListItem'

interface ChatListProps {
  accountId: string
}

export default function ChatList({ accountId }: ChatListProps) {
  const filteredChats = useChatsStore((s) => s.getFilteredChats())
  const activeChatJid = useChatsStore((s) => s.activeChatJid)
  const setActiveChat = useChatsStore((s) => s.setActiveChat)
  const clearMessages = useMessagesStore((s) => s.clear)
  const setMessages = useMessagesStore((s) => s.setMessages)
  const setHasMore = useMessagesStore((s) => s.setHasMore)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleChatClick = useCallback(
    async (jid: string) => {
      setActiveChat(jid)
      clearMessages()

      try {
        const messages = await window.api.invoke('chat:load', {
          accountId,
          jid,
          limit: 50,
        })
        setMessages(messages)
        setHasMore(messages.length === 50)

        // Mark as read
        await window.api.invoke('chat:markRead', { accountId, jid })
        useChatsStore.getState().updateChat(jid, { unreadCount: 0 })
      } catch (err) {
        console.error('Failed to load chat messages:', err)
      }
    },
    [accountId, setActiveChat, clearMessages, setMessages, setHasMore]
  )

  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const chat = filteredChats[index]
      if (!chat) return null
      return (
        <ChatListItem
          chat={chat}
          isActive={chat.jid === activeChatJid}
          onClick={() => handleChatClick(chat.jid)}
          style={style}
        />
      )
    },
    [filteredChats, activeChatJid, handleChatClick]
  )

  return (
    <div className="w-[280px] bg-bg-secondary border-r border-border-primary flex flex-col shrink-0">
      <ChatListHeader accountId={accountId} />

      {/* Virtualized chat list */}
      <div ref={containerRef} className="flex-1 min-h-0">
        {filteredChats.length > 0 ? (
          <AutoSizedList
            containerRef={containerRef}
            itemCount={filteredChats.length}
            itemSize={64}
            Row={Row}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="text-text-muted text-xs">No chats found</span>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Wraps react-window FixedSizeList to auto-fill available height from a parent ref.
 */
function AutoSizedList({
  containerRef,
  itemCount,
  itemSize,
  Row,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>
  itemCount: number
  itemSize: number
  Row: React.ComponentType<{ index: number; style: React.CSSProperties }>
}) {
  const [height, setHeight] = useState(400)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setHeight(entry.contentRect.height)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [containerRef])

  return (
    <List
      height={height}
      itemCount={itemCount}
      itemSize={itemSize}
      width="100%"
    >
      {Row}
    </List>
  )
}
