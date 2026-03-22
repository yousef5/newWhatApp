import type { Account } from '@shared/types'
import AccountAvatar from './AccountAvatar'

interface AccountSidebarProps {
  accounts: Account[]
  activeAccountId: string | null
  avatars: Record<string, string>
  onSwitchAccount: (id: string) => void
  onAddAccount: () => void
  onOpenSettings: () => void
  onRenameAccount: (id: string, name: string) => void
  onChangeAvatar: (id: string) => void
  onRemoveAvatar: (id: string) => void
  onRemoveAccount: (id: string) => void
}

export default function AccountSidebar({
  accounts, activeAccountId, avatars,
  onSwitchAccount, onAddAccount, onOpenSettings,
  onRenameAccount, onChangeAvatar, onRemoveAvatar, onRemoveAccount,
}: AccountSidebarProps) {
  return (
    <div className="w-[62px] bg-bg-sidebar border-r-2 border-border-secondary flex flex-col items-center py-3 shrink-0">
      {/* App Logo */}
      <div className="w-10 h-10 mb-4 shrink-0">
        <svg viewBox="0 0 512 512" fill="none" className="w-full h-full">
          <path d="M256 16L460 144v224L256 496 52 368V144L256 16z" fill="#0a0a0a" stroke="#a855f7" strokeWidth="12"/>
          <g transform="translate(120, 150)">
            <path d="M0 24C0 10.7 10.7 0 24 0h88c13.3 0 24 10.7 24 24v56c0 13.3-10.7 24-24 24H40l-24 24V104H24C10.7 104 0 93.3 0 80V24z" fill="#a855f7"/>
            <rect x="28" y="44" width="8" height="28" rx="2" fill="#fff" opacity="0.9"/>
            <rect x="44" y="34" width="8" height="38" rx="2" fill="#fff" opacity="0.9"/>
            <rect x="60" y="24" width="8" height="48" rx="2" fill="#fff" opacity="0.9"/>
            <rect x="76" y="14" width="8" height="58" rx="2" fill="#fff" opacity="0.9"/>
            <rect x="92" y="24" width="8" height="48" rx="2" fill="#fff" opacity="0.9"/>
          </g>
          <g transform="translate(220, 210)">
            <path d="M136 24C136 10.7 125.3 0 112 0H24C10.7 0 0 10.7 0 24v56c0 13.3 10.7 24 24 24h72l24 24V104h-8c13.3 0 24-10.7 24-24V24z" fill="#3b82f6"/>
            <rect x="28" y="44" width="8" height="28" rx="2" fill="#fff" opacity="0.9"/>
            <rect x="44" y="34" width="8" height="38" rx="2" fill="#fff" opacity="0.9"/>
            <rect x="60" y="24" width="8" height="48" rx="2" fill="#fff" opacity="0.9"/>
            <rect x="76" y="34" width="8" height="38" rx="2" fill="#fff" opacity="0.9"/>
            <rect x="92" y="44" width="8" height="28" rx="2" fill="#fff" opacity="0.9"/>
          </g>
          <g transform="translate(196, 340)">
            <path d="M60 0C40 0 24 16 24 36S40 72 60 72c12 0 22-6 30-16 8 10 18 16 30 16 20 0 36-16 36-36S140 0 120 0c-12 0-22 6-30 16C82 6 72 0 60 0z" fill="none" stroke="#22c55e" strokeWidth="6" strokeLinecap="round"/>
          </g>
        </svg>
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
