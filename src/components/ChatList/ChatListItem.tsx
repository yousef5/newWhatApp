import type { Chat } from '@shared/types'
import { formatTime, truncate, getInitials } from '@/lib/utils'

interface ChatListItemProps {
  chat: Chat
  isActive: boolean
  onClick: () => void
}

const AVATAR_COLORS = [
  '#a855f7', '#3b82f6', '#22c55e', '#e040fb', '#f59e0b',
  '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#10b981',
]

function getAvatarColor(jid: string): string {
  let hash = 0
  for (let i = 0; i < jid.length; i++) {
    hash = jid.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function formatChatName(chat: Chat): string {
  if (chat.name) return chat.name
  const raw = chat.jid.split('@')[0]
  // Format as phone number if it's all digits
  if (/^\d{8,}$/.test(raw)) {
    return '+' + raw.replace(/(\d{3})(?=\d{4,})/g, '$1 ')
  }
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
      {/* Avatar */}
      {chat.profilePicture ? (
        <img
          src={`local-file://${chat.profilePicture}`}
          alt=""
          className="w-10 h-10 shrink-0 object-cover border-2 border-border-secondary"
        />
      ) : (
        <div
          className="w-10 h-10 flex items-center justify-center shrink-0 text-white text-xs font-bold font-mono border-2 border-border-secondary"
          style={{ backgroundColor: chat.isGroup ? '#3b82f6' : getAvatarColor(chat.jid) }}
        >
          {getInitials(displayName)}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={`text-[13px] font-bold truncate font-mono ${hasUnread ? 'text-text-primary' : 'text-text-primary'}`}>
            {displayName}
          </span>
          {chat.lastMessageTimestamp != null && (
            <span
              className={`text-[10px] shrink-0 ml-2 font-mono ${
                hasUnread ? 'text-accent-purple font-bold' : 'text-text-muted'
              }`}
            >
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
