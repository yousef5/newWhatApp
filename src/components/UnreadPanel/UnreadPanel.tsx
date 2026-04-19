import type { Account } from '@shared/types'
import { getInitials } from '@/lib/utils'

export interface UnreadChat {
  name: string
  message: string
  count: number
}

interface UnreadPanelProps {
  accounts: Account[]
  activeAccountId: string | null
  avatars: Record<string, string>
  unreads: Record<string, number>
  unreadChats: Record<string, UnreadChat[]>
  onSwitchAccount: (id: string) => void
  onClose: () => void
}

export default function UnreadPanel({
  accounts,
  activeAccountId,
  avatars,
  unreads,
  unreadChats,
  onSwitchAccount,
  onClose,
}: UnreadPanelProps) {
  // Show all non-active accounts (those with unreads first, then others)
  const otherAccounts = accounts.filter((acc) => acc.id !== activeAccountId)
  const withUnreads = otherAccounts.filter((acc) => (unreads[acc.id] || 0) > 0)
  const withoutUnreads = otherAccounts.filter((acc) => (unreads[acc.id] || 0) === 0)

  return (
    <div className="h-full w-[280px] bg-bg-sidebar border-l-2 border-accent-purple flex flex-col shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b-2 border-border-secondary">
        <span className="text-[11px] font-bold text-text-primary font-mono uppercase tracking-widest">
          UNREAD
        </span>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center text-text-muted hover:text-text-primary cursor-pointer"
        >
          <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="1" x2="13" y2="13" />
            <line x1="13" y1="1" x2="1" y2="13" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {otherAccounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <line x1="9" y1="10" x2="9.01" y2="10" />
              <line x1="12" y1="10" x2="12.01" y2="10" />
              <line x1="15" y1="10" x2="15.01" y2="10" />
            </svg>
            <span className="text-[9px] text-text-muted font-mono uppercase text-center leading-relaxed">
              ADD MORE ACCOUNTS<br />TO SEE UNREADS HERE
            </span>
          </div>
        ) : (
          <>
            {/* Accounts with unreads */}
            {withUnreads.map((acc) => (
              <AccountSection
                key={acc.id}
                account={acc}
                avatars={avatars}
                totalUnread={unreads[acc.id] || 0}
                chats={unreadChats[acc.id] || []}
                onSwitchAccount={onSwitchAccount}
              />
            ))}

            {/* Accounts without unreads */}
            {withoutUnreads.map((acc) => (
              <AccountSection
                key={acc.id}
                account={acc}
                avatars={avatars}
                totalUnread={0}
                chats={[]}
                onSwitchAccount={onSwitchAccount}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function AccountSection({
  account,
  avatars,
  totalUnread,
  chats,
  onSwitchAccount,
}: {
  account: Account
  avatars: Record<string, string>
  totalUnread: number
  chats: UnreadChat[]
  onSwitchAccount: (id: string) => void
}) {
  const imgSrc = avatars[account.id] || account.customAvatar
  const hasUnreads = totalUnread > 0

  return (
    <div className="border-b border-border-primary">
      {/* Account header */}
      <button
        onClick={() => onSwitchAccount(account.id)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-bg-tertiary cursor-pointer"
      >
        {/* Avatar with glow when has unreads */}
        <div
          className="w-7 h-7 shrink-0 overflow-hidden"
          style={{
            borderRadius: '50%',
            border: hasUnreads ? '2px solid #a855f7' : '2px solid transparent',
            boxShadow: hasUnreads ? '0 0 8px rgba(168,85,247,0.3)' : 'none',
          }}
        >
          {imgSrc ? (
            <img src={imgSrc} alt="" className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-[9px] font-bold font-mono"
              style={{
                backgroundColor: account.avatarColor,
                color: '#fff',
                opacity: hasUnreads ? 1 : 0.5,
              }}
            >
              {getInitials(account.name)}
            </div>
          )}
        </div>

        <span
          className="text-[11px] font-bold font-mono uppercase truncate flex-1 text-left"
          style={{ color: hasUnreads ? '#a855f7' : '#555' }}
        >
          {account.name}
        </span>

        {/* Total unread badge */}
        {hasUnreads && (
          <span
            className="shrink-0 text-[8px] font-bold text-white font-mono px-1.5 py-px"
            style={{
              backgroundColor: '#22c55e',
              borderRadius: '7px',
              minWidth: '16px',
              textAlign: 'center',
              boxShadow: '0 0 4px rgba(34,197,94,0.4)',
            }}
          >
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}

        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={hasUnreads ? '#a855f7' : '#333'} strokeWidth="2" strokeLinecap="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* Chat entries */}
      {chats.length > 0 && (
        <div className="bg-bg-primary/30">
          {chats.map((chat, i) => (
            <button
              key={i}
              onClick={() => onSwitchAccount(account.id)}
              className="w-full flex items-start gap-2 px-3 py-1.5 pl-7 hover:bg-bg-tertiary cursor-pointer text-left border-t border-border-primary/20"
            >
              {/* Chat indicator dot */}
              <div
                className="w-1.5 h-1.5 shrink-0 mt-1.5"
                style={{
                  borderRadius: '50%',
                  backgroundColor: '#22c55e',
                  boxShadow: '0 0 4px rgba(34,197,94,0.5)',
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-text-primary font-mono truncate flex-1">
                    {chat.name}
                  </span>
                  <span
                    className="shrink-0 text-[8px] font-bold font-mono"
                    style={{ color: '#22c55e' }}
                  >
                    {chat.count}
                  </span>
                </div>
                {chat.message && (
                  <p className="text-[9px] text-text-muted font-mono truncate mt-0.5 leading-tight">
                    {chat.message}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No unreads state for this account */}
      {!hasUnreads && (
        <div className="px-7 py-1.5">
          <span className="text-[8px] text-text-muted/50 font-mono uppercase">
            NO NEW MESSAGES
          </span>
        </div>
      )}
    </div>
  )
}
