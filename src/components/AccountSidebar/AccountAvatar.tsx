import type { Account } from '@shared/types'
import { getInitials } from '@/lib/utils'

interface AccountAvatarProps {
  account: Account
  isActive: boolean
  thumbnail?: string | null
  onClick: () => void
}

export default function AccountAvatar({ account, isActive, thumbnail, onClick }: AccountAvatarProps) {
  return (
    <button
      onClick={onClick}
      className={`relative w-[42px] h-[42px] flex items-center justify-center shrink-0 cursor-pointer overflow-hidden ${
        isActive
          ? 'border-2 border-accent-purple'
          : 'border-2 border-transparent hover:border-border-secondary'
      }`}
      title={account.name}
    >
      {thumbnail ? (
        <img
          src={thumbnail}
          alt={account.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center text-sm font-bold font-mono"
          style={{
            backgroundColor: isActive ? account.avatarColor : '#141414',
            color: isActive ? '#fff' : '#888888',
          }}
        >
          {getInitials(account.name)}
        </div>
      )}
    </button>
  )
}
