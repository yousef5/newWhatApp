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
            <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#c084fc"/>
              <stop offset="100%" stopColor="#7c3aed"/>
            </linearGradient>
            <linearGradient id="lg2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#60a5fa"/>
              <stop offset="100%" stopColor="#2563eb"/>
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="48" fill="#050505" stroke="#7c3aed" strokeWidth="2" opacity="0.8"/>
          {/* Phone outline */}
          <rect x="22" y="14" width="42" height="56" rx="8" fill="#111" stroke="#7c3aed" strokeWidth="1.5"/>
          {/* Screen */}
          <rect x="26" y="20" width="34" height="40" rx="2" fill="#0a0a0a"/>
          {/* Chat bubbles on screen */}
          <rect x="29" y="24" width="18" height="6" rx="3" fill="url(#lg1)" opacity="0.9"/>
          <rect x="35" y="33" width="22" height="6" rx="3" fill="url(#lg2)" opacity="0.9"/>
          <rect x="29" y="42" width="14" height="6" rx="3" fill="url(#lg1)" opacity="0.9"/>
          <rect x="38" y="51" width="19" height="6" rx="3" fill="url(#lg2)" opacity="0.9"/>
          {/* Account dots */}
          <circle cx="74" cy="28" r="8" fill="#7c3aed" stroke="#050505" strokeWidth="2"/>
          <circle cx="78" cy="48" r="8" fill="#3b82f6" stroke="#050505" strokeWidth="2"/>
          <circle cx="72" cy="66" r="8" fill="#22c55e" stroke="#050505" strokeWidth="2"/>
          <text x="74" y="32" textAnchor="middle" fontFamily="monospace" fontWeight="900" fontSize="9" fill="#fff">1</text>
          <text x="78" y="52" textAnchor="middle" fontFamily="monospace" fontWeight="900" fontSize="9" fill="#fff">2</text>
          <text x="72" y="70" textAnchor="middle" fontFamily="monospace" fontWeight="900" fontSize="9" fill="#fff">3</text>
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
