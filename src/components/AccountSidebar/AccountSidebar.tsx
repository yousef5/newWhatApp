import type { Account } from '@shared/types'
import AccountAvatar from './AccountAvatar'

interface AccountSidebarProps {
  accounts: Account[]
  activeAccountId: string | null
  avatars: Record<string, string>
  unreads: Record<string, number>
  onSwitchAccount: (id: string) => void
  onAddAccount: () => void
  onOpenSettings: () => void
  onRenameAccount: (id: string, name: string) => void
  onChangeAvatar: (id: string) => void
  onRemoveAvatar: (id: string) => void
  onRemoveAccount: (id: string) => void
}

export default function AccountSidebar({
  accounts, activeAccountId, avatars, unreads,
  onSwitchAccount, onAddAccount, onOpenSettings,
  onRenameAccount, onChangeAvatar, onRemoveAvatar, onRemoveAccount,
}: AccountSidebarProps) {
  return (
    <div className="w-[62px] bg-bg-sidebar border-r-2 border-border-secondary flex flex-col items-center py-3 shrink-0">
      {/* App Logo */}
      <div className="w-10 h-10 mb-4 shrink-0">
        <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
          <defs>
            <linearGradient id="wg" x1="0.2" y1="0" x2="0.8" y2="1">
              <stop offset="0%" stopColor="#e9d5ff"/>
              <stop offset="40%" stopColor="#c084fc"/>
              <stop offset="100%" stopColor="#7c3aed"/>
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="48" fill="#050508" stroke="#7c3aed" strokeWidth="2"/>
          <path d="M24,28 L36,72 L46,40 L54,60 L64,28" fill="none" stroke="url(#wg)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="36" cy="72" r="2" fill="#e9d5ff"/>
          <circle cx="46" cy="40" r="2" fill="#c084fc"/>
          <circle cx="54" cy="60" r="2" fill="#a855f7"/>
          <circle cx="34" cy="84" r="5" fill="#7c3aed"/>
          <circle cx="50" cy="84" r="5" fill="#3b82f6"/>
          <circle cx="66" cy="84" r="5" fill="#22c55e"/>
        </svg>
      </div>

      {/* Account list */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center gap-1 w-full px-[8px] scrollbar-thin">
        {accounts.map((account) => (
          <AccountAvatar
            key={account.id}
            account={account}
            isActive={account.id === activeAccountId}
            avatar={avatars[account.id]}
            unreadCount={unreads[account.id] || 0}
            onClick={() => onSwitchAccount(account.id)}
            onRename={onRenameAccount}
            onChangeAvatar={onChangeAvatar}
            onRemoveAvatar={onRemoveAvatar}
            onRemoveAccount={onRemoveAccount}
          />
        ))}
      </div>

      {/* Bottom actions */}
      <div className="flex flex-col items-center gap-2 mt-3">
        <button
          onClick={onAddAccount}
          className="w-[42px] h-[42px] border-2 border-dashed border-border-secondary text-text-muted flex items-center justify-center hover:border-accent-purple hover:text-accent-purple cursor-pointer"
          title="Add account"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="10" y1="4" x2="10" y2="16" />
            <line x1="4" y1="10" x2="16" y2="10" />
          </svg>
        </button>

        <button
          onClick={onOpenSettings}
          className="w-[42px] h-[42px] text-text-muted flex items-center justify-center hover:text-text-primary hover:bg-bg-tertiary cursor-pointer border-2 border-transparent hover:border-border-secondary"
          title="Settings"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="10" cy="10" r="3" />
            <path d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M3.4 3.4l1.4 1.4M15.2 15.2l1.4 1.4M3.4 16.6l1.4-1.4M15.2 4.8l1.4-1.4" />
          </svg>
        </button>
      </div>
    </div>
  )
}
