import type { Account } from '@shared/types'
import AccountAvatar from './AccountAvatar'

import type { ViewState } from '@/components/WhatsAppView/WhatsAppView'

interface AccountSidebarProps {
  accounts: Account[]
  activeAccountId: string | null
  avatars: Record<string, string>
  unreads: Record<string, number>
  viewStates: Record<string, ViewState>
  onSwitchAccount: (id: string) => void
  onAddAccount: () => void
  onOpenSettings: () => void
  onRenameAccount: (id: string, name: string) => void
  onChangeAvatar: (id: string) => void
  onRemoveAvatar: (id: string) => void
  onRemoveAccount: (id: string) => void
  onRefreshAccount: (id: string) => void
  onResetAccount: (id: string) => void
}

export default function AccountSidebar({
  accounts, activeAccountId, avatars, unreads, viewStates,
  onSwitchAccount, onAddAccount, onOpenSettings,
  onRenameAccount, onChangeAvatar, onRemoveAvatar, onRemoveAccount, onRefreshAccount, onResetAccount,
}: AccountSidebarProps) {
  return (
    <div className="w-[62px] bg-bg-sidebar border-r-2 border-border-secondary flex flex-col items-center py-3 shrink-0">
      {/* App Logo */}
      <div className="w-10 h-10 mb-4 shrink-0">
        <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
          <defs>
            <linearGradient id="ng" x1="0.2" y1="0" x2="0.8" y2="1">
              <stop offset="0%" stopColor="#e9d5ff"/>
              <stop offset="40%" stopColor="#c084fc"/>
              <stop offset="100%" stopColor="#7c3aed"/>
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <circle cx="50" cy="50" r="48" fill="#050508" stroke="#7c3aed" strokeWidth="2"/>
          {/* Central hub */}
          <circle cx="50" cy="44" r="11" fill="#0a0a12" stroke="url(#ng)" strokeWidth="2"/>
          <circle cx="50" cy="44" r="5" fill="#a855f7" filter="url(#glow)"/>
          {/* Connection lines */}
          <line x1="50" y1="55" x2="30" y2="72" stroke="url(#ng)" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="50" y1="55" x2="70" y2="72" stroke="url(#ng)" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="50" y1="33" x2="50" y2="22" stroke="url(#ng)" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="42" y1="37" x2="30" y2="28" stroke="url(#ng)" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="58" y1="37" x2="70" y2="28" stroke="url(#ng)" strokeWidth="2.5" strokeLinecap="round"/>
          {/* Outer nodes */}
          <circle cx="50" cy="20" r="5" fill="#7c3aed"/>
          <circle cx="28" cy="26" r="5" fill="#6d28d9"/>
          <circle cx="72" cy="26" r="5" fill="#6d28d9"/>
          <circle cx="28" cy="74" r="6" fill="#3b82f6"/>
          <circle cx="72" cy="74" r="6" fill="#22c55e"/>
          {/* Node highlights */}
          <circle cx="49" cy="19" r="1.5" fill="#e9d5ff" opacity="0.6"/>
          <circle cx="27" cy="73" r="1.5" fill="#93c5fd" opacity="0.6"/>
          <circle cx="71" cy="73" r="1.5" fill="#86efac" opacity="0.6"/>
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
            isDisconnected={viewStates[account.id] === 'offline' || viewStates[account.id] === 'error'}
            onClick={() => onSwitchAccount(account.id)}
            onRename={onRenameAccount}
            onChangeAvatar={onChangeAvatar}
            onRemoveAvatar={onRemoveAvatar}
            onRemoveAccount={onRemoveAccount}
            onRefresh={onRefreshAccount}
            onResetSession={onResetAccount}
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
