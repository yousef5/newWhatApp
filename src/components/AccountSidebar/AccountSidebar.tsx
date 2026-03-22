import type { AccountWithState } from '@shared/types'
import AccountAvatar from './AccountAvatar'

interface AccountSidebarProps {
  accounts: AccountWithState[]
  activeAccountId: string | null
  onSwitchAccount: (id: string) => void
  onAddAccount: () => void
  onOpenSettings: () => void
}

export default function AccountSidebar({
  accounts,
  activeAccountId,
  onSwitchAccount,
  onAddAccount,
  onOpenSettings,
}: AccountSidebarProps) {
  return (
    <div className="w-[62px] bg-bg-sidebar border-r border-border-primary flex flex-col items-center py-3 shrink-0">
      {/* App Logo */}
      <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center mb-4 shrink-0">
        <span className="text-white font-bold text-base leading-none">W</span>
      </div>

      {/* Account list */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center gap-2 w-full px-[10px] scrollbar-thin">
        {accounts.map((account) => (
          <AccountAvatar
            key={account.id}
            account={account}
            isActive={account.id === activeAccountId}
            onClick={() => onSwitchAccount(account.id)}
          />
        ))}
      </div>

      {/* Bottom actions */}
      <div className="flex flex-col items-center gap-2 mt-3">
        {/* Add account button */}
        <button
          onClick={onAddAccount}
          className="w-[42px] h-[42px] rounded-xl border-2 border-dashed border-border-secondary text-text-muted flex items-center justify-center hover:border-text-secondary hover:text-text-secondary transition-colors cursor-pointer"
          title="Add account"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="10" y1="4" x2="10" y2="16" />
            <line x1="4" y1="10" x2="16" y2="10" />
          </svg>
        </button>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="w-[42px] h-[42px] rounded-xl text-text-muted flex items-center justify-center hover:text-text-secondary hover:bg-bg-tertiary transition-colors cursor-pointer"
          title="Settings"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="10" cy="10" r="3" />
            <path d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M3.4 3.4l1.4 1.4M15.2 15.2l1.4 1.4M3.4 16.6l1.4-1.4M15.2 4.8l1.4-1.4" />
          </svg>
        </button>
      </div>
    </div>
  )
}
