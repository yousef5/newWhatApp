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

  // Load accounts on mount
  useEffect(() => {
    window.api
      .invoke('account:list', undefined)
      .then((accountList) => {
        setAccounts(accountList)
        if (accountList.length > 0) {
          setActiveAccount(accountList[0].id)
        }
      })
      .catch(console.error)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
    (id: string) => {
      setActiveAccount(id)
    },
    [setActiveAccount]
  )

  return (
    <div className="flex flex-col h-screen w-screen bg-bg-primary overflow-hidden">
      {/* Custom frameless title bar */}
      <div
        className="h-8 bg-bg-sidebar border-b-2 border-border-secondary flex items-center shrink-0 select-none"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex-1 px-4 text-xs text-text-primary font-bold font-mono uppercase tracking-widest">
          MULTIWHATSAPP
        </div>
        <div
          className="flex items-center h-full"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            onClick={() => window.api.window.minimize()}
            className="w-12 h-full flex items-center justify-center text-text-muted hover:bg-bg-tertiary hover:text-text-primary cursor-pointer border-l-2 border-border-primary"
          >
            <svg width="12" height="1" viewBox="0 0 12 1" fill="currentColor">
              <rect width="12" height="1" />
            </svg>
          </button>
          <button
            onClick={() => window.api.window.maximize()}
            className="w-12 h-full flex items-center justify-center text-text-muted hover:bg-bg-tertiary hover:text-text-primary cursor-pointer border-l-2 border-border-primary"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="0.5" y="0.5" width="9" height="9" />
            </svg>
          </button>
          <button
            onClick={() => window.api.window.close()}
            className="w-12 h-full flex items-center justify-center text-text-muted hover:bg-accent-red hover:text-white cursor-pointer border-l-2 border-border-primary"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="1" y1="1" x2="9" y2="9" />
              <line x1="9" y1="1" x2="1" y2="9" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 min-h-0">
        {/* Account sidebar */}
        <AccountSidebar
          accounts={accounts}
          activeAccountId={activeAccountId}
          onSwitchAccount={switchAccount}
          onAddAccount={handleAddAccount}
          onOpenSettings={() => setShowSettings(true)}
        />

        {accounts.length === 0 ? (
          /* No accounts: welcome state */
          <EmptyState
            title="WELCOME TO MULTIWHATSAPP"
            subtitle="Click the + button to add your first WhatsApp account"
          />
        ) : (
          /* Stack of WhatsApp Web webviews — only active one is visible */
          <div className="flex-1 relative">
            {accounts.map((account) => (
              <WhatsAppView
                key={account.id}
                accountId={account.id}
                isActive={account.id === activeAccountId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Settings overlay */}
      {showSettings && (
        <Settings onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}
