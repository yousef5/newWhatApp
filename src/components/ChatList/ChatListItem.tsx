import type { Chat } from '@shared/types'
import { formatTime, truncate } from '@/lib/utils'
import Avatar from '@/components/shared/Avatar'

interface ChatListItemProps {
  chat: Chat
  isActive: boolean
  onClick: () => void
}

function formatPhoneNumber(digits: string): string {
  if (digits.startsWith('20') && digits.length >= 11) {
    return '+20 ' + digits.slice(2, 5) + ' ' + digits.slice(5, 8) + ' ' + digits.slice(8)
  }
  if (digits.length >= 10 && digits.length <= 15) {
    return '+' + digits.slice(0, 3) + ' ' + digits.slice(3, 6) + ' ' + digits.slice(6)
  }
  return '+' + digits
}

function formatChatName(chat: Chat): string {
  if (chat.name) return chat.name
  const raw = chat.jid.split('@')[0]
  const suffix = chat.jid.split('@')[1]
  if (suffix === 's.whatsapp.net' && /^\d+$/.test(raw)) return formatPhoneNumber(raw)
  if (suffix === 'lid') return '~' + raw.slice(-6)
  if (suffix === 'g.us') return 'Group'
  return raw
}

export default function ChatListItem({ chat, isActive, onClick }: ChatListItemProps) {
  const hasUnread = chat.unreadCount > 0
  const displayName = formatChatName(chat)

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 cursor-pointer text-left border-b border-border-primary ${
        isActive
          ? 'bg-bg-tertiary border-l-4 border-l-accent-purple'
          : 'hover:bg-bg-tertiary/50 border-l-4 border-l-transparent'
      }`}
    >
      <Avatar
        filePath={chat.profilePicture}
        name={displayName}
        jid={chat.jid}
        size={40}
        isGroup={chat.isGroup}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-bold truncate font-mono text-text-primary">
            {displayName}
          </span>
          {chat.lastMessageTimestamp != null && (
            <span className={`text-[10px] shrink-0 ml-2 font-mono ${hasUnread ? 'text-accent-purple font-bold' : 'text-text-muted'}`}>
              {formatTime(chat.lastMessageTimestamp)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[11px] text-text-muted truncate">
            {chat.lastMessagePreview ? truncate(chat.lastMessagePreview, 35) : '\u00A0'}
          </span>
          {hasUnread && (
            <span className="min-w-[20px] h-[20px] bg-accent-purple text-white text-[10px] font-bold flex items-center justify-center shrink-0 ml-2 px-1 font-mono">
              {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
