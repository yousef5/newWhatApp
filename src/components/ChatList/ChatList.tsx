import { useCallback, useMemo, useEffect } from 'react'
import { useChatsStore } from '@/stores/chats'
import { useMessagesStore } from '@/stores/messages'
import { preloadFileUrls } from '@/hooks/useFileUrl'
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

  // Preload avatar images when chat list changes
  useEffect(() => {
    const paths = filteredChats.slice(0, 30).map(c => c.profilePicture).filter(Boolean)
    if (paths.length > 0) preloadFileUrls(paths)
  }, [filteredChats])

  const handleChatClick = useCallback(
    async (jid: string) => {
      useChatsStore.getState().setActiveChat(jid)
      useMessagesStore.getState().clear()

      try {
        let messages = await window.api.invoke('chat:load', {
          accountId,
          jid,
          limit: 200,
        })

        // If no local messages, request from WhatsApp server
        if (messages.length === 0) {
          useMessagesStore.getState().setLoading(true)
          await (window.api as any).invoke('chat:fetchHistory', { accountId, jid, count: 50 })
          // Wait a bit for messages to arrive via events
          await new Promise(r => setTimeout(r, 3000))
          messages = await window.api.invoke('chat:load', { accountId, jid, limit: 200 })
          useMessagesStore.getState().setLoading(false)
        }

        useMessagesStore.getState().setMessages(messages)
        useMessagesStore.getState().setHasMore(messages.length >= 200)

        await window.api.invoke('chat:markRead', { accountId, jid })
        useChatsStore.getState().updateChat(jid, { unreadCount: 0 })
      } catch (err) {
        console.error('Failed to load chat messages:', err)
        useMessagesStore.getState().setLoading(false)
      }
    },
    [accountId]
  )

  return (
    <div className="w-[280px] bg-bg-secondary border-r-2 border-border-secondary flex flex-col shrink-0">
      <ChatListHeader accountId={accountId} />

      <div className="flex-1 min-h-0 overflow-y-auto">
        {filteredChats.length > 0 ? (
          filteredChats.map((chat) => (
            <ChatListItem
              key={chat.jid}
              chat={chat}
              isActive={chat.jid === activeChatJid}
              onClick={() => handleChatClick(chat.jid)}
            />
          ))
        ) : (
          <LoadingChats />
        )}
      </div>
    </div>
  )
}

function LoadingChats() {
  return (
    <div className="flex flex-col h-full">
      {/* Skeleton chat items */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3 border-b border-border-primary animate-pulse">
          <div className="w-10 h-10 bg-bg-tertiary shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between">
              <div className="h-3 bg-bg-tertiary" style={{ width: `${60 + Math.random() * 80}px` }} />
              <div className="h-2 bg-bg-tertiary w-10" />
            </div>
            <div className="h-2 bg-bg-tertiary" style={{ width: `${100 + Math.random() * 100}px` }} />
          </div>
        </div>
      ))}

      {/* Loading text */}
      <div className="flex flex-col items-center justify-center py-6 gap-3">
        <div className="w-6 h-6 border-2 border-accent-purple border-t-transparent animate-spin" />
        <span className="text-text-muted text-[10px] font-mono uppercase tracking-wider">
          SYNCING CHATS...
        </span>
      </div>
    </div>
  )
}
