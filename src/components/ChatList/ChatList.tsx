import { useCallback, useRef, useState, useEffect, useMemo } from 'react'
import { List } from 'react-window'
import { useChatsStore } from '@/stores/chats'
import { useMessagesStore } from '@/stores/messages'
import ChatListHeader from './ChatListHeader'
import ChatListItem from './ChatListItem'

interface ChatListProps {
  accountId: string
}

export default function ChatList({ accountId }: ChatListProps) {
  const chats = useChatsStore((s) => s.chats)
  const filter = useChatsStore((s) => s.filter)
  const searchQuery = useChatsStore((s) => s.searchQuery)
  const activeChatJid = useChatsStore((s) => s.activeChatJid)

  const filteredChats = useMemo(() => {
    let result = chats.filter((c) => !c.archived)
    if (filter === 'unread') result = result.filter((c) => c.unreadCount > 0)
    else if (filter === 'groups') result = result.filter((c) => c.isGroup)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((c) => c.name?.toLowerCase().includes(q))
    }
    return result.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return (b.lastMessageTimestamp ?? 0) - (a.lastMessageTimestamp ?? 0)
    })
  }, [chats, filter, searchQuery])

  const handleChatClick = useCallback(
    async (jid: string) => {
      useChatsStore.getState().setActiveChat(jid)
      useMessagesStore.getState().clear()

      try {
        const messages = await window.api.invoke('chat:load', {
          accountId,
          jid,
          limit: 50,
        })
        useMessagesStore.getState().setMessages(messages)
        useMessagesStore.getState().setHasMore(messages.length === 50)

        await window.api.invoke('chat:markRead', { accountId, jid })
        useChatsStore.getState().updateChat(jid, { unreadCount: 0 })
      } catch (err) {
        console.error('Failed to load chat messages:', err)
      }
    },
    [accountId]
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

      <div className="flex-1 min-h-0">
        {filteredChats.length > 0 ? (
          <AutoSizedList
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

function AutoSizedList({
  itemCount,
  itemSize,
  Row,
}: {
  itemCount: number
  itemSize: number
  Row: React.ComponentType<{ index: number; style: React.CSSProperties }>
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(400)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    setHeight(el.clientHeight)
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setHeight(entry.contentRect.height)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef} style={{ height: '100%' }}>
      <List
        height={height}
        itemCount={itemCount}
        itemSize={itemSize}
        width="100%"
      >
        {Row}
      </List>
    </div>
  )
}
