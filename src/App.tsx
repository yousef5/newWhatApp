import { useState, useEffect, useCallback } from 'react'
import { useAccountsStore } from '@/stores/accounts'
import AccountSidebar from '@/components/AccountSidebar/AccountSidebar'
import EmptyState from '@/components/shared/EmptyState'
import WhatsAppView from '@/components/WhatsAppView/WhatsAppView'
import Settings from '@/components/Settings/Settings'

export default function App() {
  const accounts = useAccountsStore((s) => s.accounts)
  const activeAccountId = useAccountsStore((s) => s.activeAccountId)
  const setAccounts = useAccountsStore((s) => s.setAccounts)
  const setActiveAccount = useAccountsStore((s) => s.setActiveAccount)

  const [showSettings, setShowSettings] = useState(false)
  const [avatars, setAvatars] = useState<Record<string, string>>({})
  const [unreads, setUnreads] = useState<Record<string, number>>({})
  const [pendingAccountId, setPendingAccountId] = useState<string | null>(null)

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
    // Don't allow adding if there's already a pending account
    if (pendingAccountId) return

    try {
      const account = await window.api.invoke('account:create', {
        name: `Account ${accounts.length + 1}`,
      })
      setPendingAccountId(account.id)
      const updated = await window.api.invoke('account:list', undefined)
      setAccounts(updated)
      setActiveAccount(account.id)
    } catch (err) {
      console.error('Failed to create account:', err)
    }
  }, [accounts.length, pendingAccountId, setAccounts, setActiveAccount])

  const handleLoginSuccess = useCallback((accountId: string) => {
    // Account successfully logged in — no longer pending
    if (accountId === pendingAccountId) {
      setPendingAccountId(null)
    }
  }, [pendingAccountId])

  // If user switches away from pending account before logging in, remove it
  const handleSwitchFromPending = useCallback(async (newAccountId: string) => {
    if (pendingAccountId && newAccountId !== pendingAccountId) {
      // Check if pending account was logged in
      // Give it a moment to detect login
      setTimeout(async () => {
        if (pendingAccountId === useAccountsStore.getState().activeAccountId) return // still active, don't remove
        // Remove the pending account that was never logged in
        const stillPending = pendingAccountId // capture before async
        setPendingAccountId(null)
        await window.api.invoke('account:remove', { id: stillPending }).catch(() => {})
        const updated = await window.api.invoke('account:list', undefined)
        setAccounts(updated)
      }, 500)
    }
    setActiveAccount(newAccountId)
  }, [pendingAccountId, setAccounts, setActiveAccount])

  const switchAccount = useCallback(
    (id: string) => {
      if (pendingAccountId && id !== pendingAccountId) {
        handleSwitchFromPending(id)
      } else {
        setActiveAccount(id)
      }
    },
    [pendingAccountId, setActiveAccount, handleSwitchFromPending]
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

  const handleRemoveAccount = useCallback(async (id: string) => {
    if (id !== pendingAccountId && !confirm('Remove this account? The WhatsApp session will be deleted.')) return
    if (id === pendingAccountId) setPendingAccountId(null)
    await window.api.invoke('account:remove', { id })
    const updated = await window.api.invoke('account:list', undefined)
    setAccounts(updated)
    setAvatars((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    if (activeAccountId === id) {
      setActiveAccount(updated.length > 0 ? updated[0].id : null)
    }
  }, [accounts, activeAccountId, setAccounts, setActiveAccount])

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
            <path d="M24,28 L36,72 L46,40 L54,60 L64,28" fill="none" stroke="url(#twg)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-xs text-text-primary font-bold font-mono uppercase tracking-widest">MW</span>
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
          onSwitchAccount={switchAccount}
          onAddAccount={handleAddAccount}
          onOpenSettings={() => setShowSettings(true)}
          onRenameAccount={handleRenameAccount}
          onChangeAvatar={handleChangeAvatar}
          onRemoveAvatar={handleRemoveAvatar}
          onRemoveAccount={handleRemoveAccount}
        />

        {accounts.length === 0 ? (
          <EmptyState
            title="WELCOME TO MULTIWHATSAPP"
            subtitle="Click the + button to add your first WhatsApp account"
          />
        ) : (
          <div className="flex-1 relative overflow-hidden" style={{ minWidth: 0, minHeight: 0 }}>
            {accounts.map((account) => (
              <WhatsAppView
                key={account.id}
                accountId={account.id}
                isActive={account.id === activeAccountId}
                isPending={account.id === pendingAccountId}
                onAvatarUpdate={handleAvatarUpdate}
                onNameUpdate={handleNameUpdate}
                onUnreadUpdate={handleUnreadUpdate}
                onLoginSuccess={handleLoginSuccess}
              />
            ))}
          </div>
        )}
      </div>

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  )
}
