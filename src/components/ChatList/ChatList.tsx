import { useCallback, useMemo } from 'react'
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
          <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
            <span className="text-text-muted text-xs font-mono uppercase">WAITING FOR CHATS...</span>
            <span className="text-text-muted text-[10px] font-mono text-center">
              IF EMPTY AFTER 30S, REMOVE ACCOUNT AND RE-LINK
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
