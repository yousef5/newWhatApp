import type { Chat } from '@shared/types'
import { formatTime, truncate, getInitials } from '@/lib/utils'

interface ChatListItemProps {
  chat: Chat
  isActive: boolean
  onClick: () => void
}

export default function ChatListItem({ chat, isActive, onClick }: ChatListItemProps) {
  const hasUnread = chat.unreadCount > 0

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors cursor-pointer text-left ${
        isActive
          ? 'bg-bg-secondary border-l-[3px] border-accent-purple'
          : 'hover:bg-bg-secondary/50 border-l-[3px] border-transparent'
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-semibold ${
          chat.isGroup ? 'bg-accent-blue' : 'bg-bg-tertiary'
        }`}
      >
        {getInitials(chat.name || chat.jid.split('@')[0])}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold text-text-primary truncate">
            {chat.name || chat.jid.split('@')[0]}
          </span>
          {chat.lastMessageTimestamp && (
            <span
              className={`text-[10px] shrink-0 ml-2 ${
                hasUnread ? 'text-accent-purple' : 'text-text-muted'
              }`}
            >
              {formatTime(chat.lastMessageTimestamp)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[11px] text-text-muted truncate">
            {chat.lastMessagePreview ? truncate(chat.lastMessagePreview, 40) : '\u00A0'}
          </span>
          {hasUnread && (
            <span className="w-[18px] h-[18px] rounded-full bg-accent-purple text-white text-[10px] font-bold flex items-center justify-center shrink-0 ml-2">
              {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
