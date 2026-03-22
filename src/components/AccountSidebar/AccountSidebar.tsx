import type { Account } from '@shared/types'
import AccountAvatar from './AccountAvatar'

interface AccountSidebarProps {
  accounts: Account[]
  activeAccountId: string | null
  avatars: Record<string, string>
  onSwitchAccount: (id: string) => void
  onAddAccount: () => void
  onOpenSettings: () => void
}

export default function AccountSidebar({
  accounts,
  activeAccountId,
  avatars,
  onSwitchAccount,
  onAddAccount,
  onOpenSettings,
}: AccountSidebarProps) {
  return (
    <div className="w-[62px] bg-bg-sidebar border-r-2 border-border-secondary flex flex-col items-center py-3 shrink-0">
      {/* App Logo */}
      <div className="w-9 h-9 bg-accent-purple flex items-center justify-center mb-4 shrink-0 border-2 border-accent-purple">
        <span className="text-white font-bold text-base leading-none font-mono">W</span>
      </div>

      {/* Account list */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center gap-2 w-full px-[10px] scrollbar-thin">
        {accounts.map((account) => (
          <AccountAvatar
            key={account.id}
            account={account}
            isActive={account.id === activeAccountId}
            avatar={avatars[account.id]}
            onClick={() => onSwitchAccount(account.id)}
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
