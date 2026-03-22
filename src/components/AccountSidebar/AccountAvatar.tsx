import type { AccountWithState } from '@shared/types'
import { getInitials } from '@/lib/utils'

interface AccountAvatarProps {
  account: AccountWithState
  isActive: boolean
  onClick: () => void
}

export default function AccountAvatar({ account, isActive, onClick }: AccountAvatarProps) {
  const initials = getInitials(account.name)
  const statusColor =
    account.connectionState === 'open'
      ? 'bg-accent-green'
      : account.connectionState === 'connecting'
        ? 'bg-yellow-500'
        : 'bg-gray-500'

  return (
    <button
      onClick={onClick}
      className={`relative w-[42px] h-[42px] flex items-center justify-center text-sm font-bold shrink-0 cursor-pointer font-mono ${
        isActive
          ? 'border-2 border-accent-purple'
          : 'border-2 border-transparent hover:border-border-secondary'
      }`}
      style={{
        backgroundColor: isActive ? account.avatarColor : '#141414',
        color: isActive ? '#fff' : '#888888',
      }}
      title={account.name}
    >
      {initials}

      {/* Connection status dot */}
      <span
        className={`absolute -bottom-0.5 -right-0.5 w-[10px] h-[10px] border-2 border-bg-sidebar ${statusColor}`}
      />

      {/* Unread badge */}
      {!isActive && account.unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-accent-red text-white text-[10px] font-bold flex items-center justify-center px-1 font-mono">
          {account.unreadCount > 99 ? '99+' : account.unreadCount}
        </span>
      )}
    </button>
  )
}
