import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAccountsStore } from '@/stores/accounts'
import AccountSidebar from '@/components/AccountSidebar/AccountSidebar'
import EmptyState from '@/components/shared/EmptyState'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import UnreadPanel from '@/components/UnreadPanel/UnreadPanel'
import type { UnreadChat } from '@/components/UnreadPanel/UnreadPanel'
import WhatsAppView from '@/components/WhatsAppView/WhatsAppView'
import type { ViewState } from '@/components/WhatsAppView/WhatsAppView'
import Settings from '@/components/Settings/Settings'

export default function App() {
  const accounts = useAccountsStore((s) => s.accounts)
  const activeAccountId = useAccountsStore((s) => s.activeAccountId)
  const setAccounts = useAccountsStore((s) => s.setAccounts)
  const setActiveAccount = useAccountsStore((s) => s.setActiveAccount)

  const [showSettings, setShowSettings] = useState(false)
  const [avatars, setAvatars] = useState<Record<string, string>>({})
  const [unreads, setUnreads] = useState<Record<string, number>>({})
  const [viewStates, setViewStates] = useState<Record<string, ViewState>>({})
  const [refreshCounters, setRefreshCounters] = useState<Record<string, number>>({})
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [unreadChats, setUnreadChats] = useState<Record<string, UnreadChat[]>>({})
  const [showUnreadPanel, setShowUnreadPanel] = useState(false)

  // Load accounts on mount
  useEffect(() => {
    window.api
      .invoke('account:list', undefined)
      .then((accountList) => {
        setAccounts(accountList)
        if (accountList.length > 0) {
          setActiveAccount(accountList[0].id)
        }
        // Load custom avatars from saved config
        const savedAvatars: Record<string, string> = {}
        for (const acc of accountList) {
          if (acc.customAvatar) savedAvatars[acc.id] = acc.customAvatar
        }
        if (Object.keys(savedAvatars).length > 0) {
          setAvatars(savedAvatars)
        }
      })
      .catch(console.error)
  }, [])

  const handleAddAccount = useCallback(async () => {
    try {
      const account = await window.api.invoke('account:create', {
        name: `Account ${accounts.length + 1}`,
      })
      const updated = await window.api.invoke('account:list', undefined)
      setAccounts(updated)
      setActiveAccount(account.id)
    } catch (err) {
      console.error('Failed to create account:', err)
    }
  }, [accounts.length, setAccounts, setActiveAccount])

  const switchAccount = useCallback(
    (id: string) => setActiveAccount(id),
    [setActiveAccount]
  )

  const handleAvatarUpdate = useCallback((accountId: string, dataUrl: string) => {
    setAvatars((prev) => ({ ...prev, [accountId]: dataUrl }))
  }, [])

  const handleNameUpdate = useCallback((accountId: string, name: string) => {
    window.api.invoke('account:rename', { id: accountId, name }).catch(() => {})
    const updated = accounts.map(a => a.id === accountId ? { ...a, name } : a)
    setAccounts(updated)
  }, [accounts, setAccounts])

  const handleUnreadUpdate = useCallback((accountId: string, count: number) => {
    setUnreads((prev) => {
      if (prev[accountId] === count) return prev
      return { ...prev, [accountId]: count }
    })
  }, [])

  const handleViewStateChange = useCallback((accountId: string, state: ViewState) => {
    setViewStates((prev) => {
      if (prev[accountId] === state) return prev
      return { ...prev, [accountId]: state }
    })
  }, [])

  const handleRefreshAccount = useCallback((id: string) => {
    setRefreshCounters((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }))
  }, [])

  const [resetCounters, setResetCounters] = useState<Record<string, number>>({})
  const handleResetAccount = useCallback((id: string) => {
    setResetCounters((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }))
    setAvatars((prev) => { const next = { ...prev }; delete next[id]; return next })
  }, [])

  const handleUnreadChatsUpdate = useCallback((accountId: string, chats: UnreadChat[]) => {
    setUnreadChats((prev) => {
      if (JSON.stringify(prev[accountId]) === JSON.stringify(chats)) return prev
      return { ...prev, [accountId]: chats }
    })
  }, [])

  const totalOtherUnreads = useMemo(() => {
    return Object.entries(unreads)
      .filter(([id]) => id !== activeAccountId)
      .reduce((sum, [, count]) => sum + count, 0)
  }, [unreads, activeAccountId])

  const handleRenameAccount = useCallback((id: string, name: string) => {
    window.api.invoke('account:rename', { id, name }).catch(() => {})
    setAccounts(accounts.map(a => a.id === id ? { ...a, name } : a))
  }, [accounts, setAccounts])

  const handleChangeAvatar = useCallback(async (id: string) => {
    const dataUrl = await window.api.invoke('dialog:pickImage', undefined)
    if (dataUrl) {
      await window.api.invoke('account:setAvatar', { id, avatar: dataUrl })
      setAvatars((prev) => ({ ...prev, [id]: dataUrl }))
      // Also update the account object
      setAccounts(accounts.map(a => a.id === id ? { ...a, customAvatar: dataUrl } : a))
    }
  }, [accounts, setAccounts])

  const handleRemoveAvatar = useCallback(async (id: string) => {
    await window.api.invoke('account:setAvatar', { id, avatar: null })
    setAvatars((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setAccounts(accounts.map(a => a.id === id ? { ...a, customAvatar: undefined } : a))
  }, [accounts, setAccounts])

  const handleRemoveAccount = useCallback((id: string) => {
    setConfirmRemoveId(id)
  }, [])

  const handleRemoveConfirmed = useCallback(async () => {
    if (!confirmRemoveId) return
    const id = confirmRemoveId
    setConfirmRemoveId(null)
    await window.api.invoke('account:remove', { id })
    const updated = await window.api.invoke('account:list', undefined)
    setAccounts(updated)
    setAvatars((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setViewStates((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    if (activeAccountId === id) {
      setActiveAccount(updated.length > 0 ? updated[0].id : null)
    }
  }, [confirmRemoveId, activeAccountId, setAccounts, setActiveAccount])

  return (
    <div className="flex flex-col h-screen w-screen bg-bg-primary overflow-hidden">
      {/* Title bar */}
      <div
        className="h-8 bg-bg-sidebar border-b-2 border-border-secondary flex items-center shrink-0 select-none"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex-1 px-3 flex items-center gap-2">
          <svg viewBox="0 0 100 100" fill="none" className="w-5 h-5 shrink-0">
            <defs>
              <linearGradient id="twg" x1="0.2" y1="0" x2="0.8" y2="1">
                <stop offset="0%" stopColor="#e9d5ff"/>
                <stop offset="100%" stopColor="#7c3aed"/>
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="48" fill="#050508" stroke="#7c3aed" strokeWidth="3"/>
            <circle cx="50" cy="44" r="8" fill="#a855f7"/>
            <line x1="50" y1="52" x2="32" y2="72" stroke="url(#twg)" strokeWidth="3" strokeLinecap="round"/>
            <line x1="50" y1="52" x2="68" y2="72" stroke="url(#twg)" strokeWidth="3" strokeLinecap="round"/>
            <line x1="50" y1="36" x2="50" y2="24" stroke="url(#twg)" strokeWidth="3" strokeLinecap="round"/>
            <circle cx="50" cy="22" r="5" fill="#7c3aed"/>
            <circle cx="30" cy="74" r="5" fill="#3b82f6"/>
            <circle cx="70" cy="74" r="5" fill="#22c55e"/>
          </svg>
          <span className="text-xs text-text-primary font-bold font-mono uppercase tracking-[3px]">NEXUS</span>
        </div>
        <div
          className="flex items-center h-full"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            onClick={() => window.api.window.minimize()}
            className="w-12 h-full flex items-center justify-center text-text-muted hover:bg-bg-tertiary hover:text-text-primary cursor-pointer border-l-2 border-border-primary"
          >
            <svg width="12" height="1" viewBox="0 0 12 1" fill="currentColor"><rect width="12" height="1" /></svg>
          </button>
          <button
            onClick={() => window.api.window.maximize()}
            className="w-12 h-full flex items-center justify-center text-text-muted hover:bg-bg-tertiary hover:text-text-primary cursor-pointer border-l-2 border-border-primary"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1"><rect x="0.5" y="0.5" width="9" height="9" /></svg>
          </button>
          <button
            onClick={() => window.api.window.close()}
            className="w-12 h-full flex items-center justify-center text-text-muted hover:bg-accent-red hover:text-white cursor-pointer border-l-2 border-border-primary"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="1" y1="1" x2="9" y2="9" /><line x1="9" y1="1" x2="1" y2="9" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 min-h-0">
        <AccountSidebar
          accounts={accounts}
          activeAccountId={activeAccountId}
          avatars={avatars}
          unreads={unreads}
          viewStates={viewStates}
          onSwitchAccount={switchAccount}
          onAddAccount={handleAddAccount}
          onOpenSettings={() => setShowSettings(true)}
          onRenameAccount={handleRenameAccount}
          onChangeAvatar={handleChangeAvatar}
          onRemoveAvatar={handleRemoveAvatar}
          onRemoveAccount={handleRemoveAccount}
          onRefreshAccount={handleRefreshAccount}
          onResetAccount={handleResetAccount}
        />

        {accounts.length === 0 ? (
          <EmptyState
            title="WELCOME TO NEXUS"
            subtitle="Click the + button to add your first WhatsApp account"
          />
        ) : (
          <>
            <div className="flex-1 relative overflow-hidden" style={{ minWidth: 0, minHeight: 0 }}>
              {accounts.map((account) => (
                <WhatsAppView
                  key={account.id}
                  accountId={account.id}
                  isActive={account.id === activeAccountId}
                  refreshTrigger={refreshCounters[account.id]}
                  resetTrigger={resetCounters[account.id]}
                  onAvatarUpdate={handleAvatarUpdate}
                  onNameUpdate={handleNameUpdate}
                  onUnreadUpdate={handleUnreadUpdate}
                  onViewStateChange={handleViewStateChange}
                  onUnreadChatsUpdate={handleUnreadChatsUpdate}
                />
              ))}

              {/* Toggle unread panel button */}
              {!showUnreadPanel && accounts.length > 1 && (
                <button
                  onClick={() => setShowUnreadPanel(true)}
                  className="absolute top-3 right-3 z-20 w-9 h-9 flex items-center justify-center cursor-pointer border-2 hover:brightness-110"
                  style={{
                    background: totalOtherUnreads > 0 ? '#7c3aed' : 'rgba(10,10,18,0.85)',
                    borderColor: totalOtherUnreads > 0 ? '#a855f7' : '#333',
                    borderRadius: '8px',
                    boxShadow: totalOtherUnreads > 0 ? '0 0 12px rgba(168,85,247,0.4)' : 'none',
                  }}
                  title="Unread messages from other accounts"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={totalOtherUnreads > 0 ? '#fff' : '#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  {totalOtherUnreads > 0 && (
                    <span
                      className="absolute -top-1.5 -right-1.5 text-[8px] font-bold text-white font-mono px-1 py-px"
                      style={{
                        backgroundColor: '#22c55e',
                        borderRadius: '6px',
                        minWidth: '14px',
                        textAlign: 'center',
                        boxShadow: '0 0 6px rgba(34,197,94,0.5)',
                      }}
                    >
                      {totalOtherUnreads > 99 ? '99+' : totalOtherUnreads}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Unread panel */}
            {showUnreadPanel && (
              <UnreadPanel
                accounts={accounts}
                activeAccountId={activeAccountId}
                avatars={avatars}
                unreads={unreads}
                unreadChats={unreadChats}
                onSwitchAccount={switchAccount}
                onClose={() => setShowUnreadPanel(false)}
              />
            )}
          </>
        )}
      </div>

      {showSettings && <Settings onClose={() => setShowSettings(false)} avatars={avatars} />}

      {/* Confirm remove dialog (from sidebar) */}
      {confirmRemoveId && !showSettings && (
        <ConfirmDialog
          title="REMOVE ACCOUNT"
          message="Are you sure you want to remove this account? The WhatsApp session will be deleted. This action cannot be undone."
          confirmText="REMOVE"
          cancelText="CANCEL"
          onConfirm={handleRemoveConfirmed}
          onCancel={() => setConfirmRemoveId(null)}
        />
      )}
    </div>
  )
}
