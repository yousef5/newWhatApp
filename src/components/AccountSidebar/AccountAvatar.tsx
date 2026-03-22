import type { Account } from '@shared/types'
import { getInitials } from '@/lib/utils'

interface AccountAvatarProps {
  account: Account
  isActive: boolean
  onClick: () => void
}

export default function AccountAvatar({ account, isActive, onClick }: AccountAvatarProps) {
  const initials = getInitials(account.name)

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
    </button>
  )
}
