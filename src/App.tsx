import { useState, useCallback } from 'react'
import { useAccounts } from '@/hooks/useAccounts'
import { useAccountsStore } from '@/stores/accounts'
import AccountSidebar from '@/components/AccountSidebar/AccountSidebar'
import ConnectionBanner from '@/components/shared/ConnectionBanner'
import EmptyState from '@/components/shared/EmptyState'

export default function App() {
  const { accounts, activeAccountId, switchAccount } = useAccounts()
  const [showQR, setShowQR] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const activeAccount = accounts.find((a) => a.id === activeAccountId)

  const handleAddAccount = useCallback(async () => {
    setShowQR(true)
    try {
      await window.api.invoke('account:create', { name: `Account ${accounts.length + 1}` })
    } catch (err) {
      console.error('Failed to create account:', err)
    }
  }, [accounts.length])

  const handleRetry = useCallback(() => {
    if (activeAccountId) {
      window.api.invoke('account:reconnect', { id: activeAccountId }).catch(console.error)
    }
  }, [activeAccountId])

  return (
    <div className="flex flex-col h-screen w-screen bg-bg-primary overflow-hidden">
      {/* Custom frameless title bar */}
      <div
        className="h-8 bg-bg-sidebar border-b border-border-primary flex items-center shrink-0 select-none"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex-1 px-4 text-xs text-text-muted font-medium">
          MultiWhatsApp
        </div>
        <div
          className="flex items-center h-full"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            onClick={() => window.api.window.minimize()}
            className="w-12 h-full flex items-center justify-center text-text-muted hover:bg-bg-tertiary transition-colors cursor-pointer"
          >
            <svg width="12" height="1" viewBox="0 0 12 1" fill="currentColor">
              <rect width="12" height="1" />
            </svg>
          </button>
          <button
            onClick={() => window.api.window.maximize()}
            className="w-12 h-full flex items-center justify-center text-text-muted hover:bg-bg-tertiary transition-colors cursor-pointer"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="0.5" y="0.5" width="9" height="9" />
            </svg>
          </button>
          <button
            onClick={() => window.api.window.close()}
            className="w-12 h-full flex items-center justify-center text-text-muted hover:bg-accent-red hover:text-white transition-colors cursor-pointer"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="1" y1="1" x2="9" y2="9" />
              <line x1="9" y1="1" x2="1" y2="9" />
            </svg>
          </button>
        </div>
      </div>

      {/* Connection banner */}
      {activeAccount && activeAccount.connectionState !== 'open' && (
        <ConnectionBanner
          state={activeAccount.connectionState}
          onRetry={activeAccount.connectionState === 'close' ? handleRetry : undefined}
        />
      )}

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
            title="Welcome to MultiWhatsApp"
            subtitle="Click the + button to add your first WhatsApp account"
          />
        ) : (
          /* Main layout: ChatList | MessageView */
          <>
            {/* Chat list placeholder */}
            <div className="w-[340px] bg-bg-secondary border-r border-border-primary flex items-center justify-center shrink-0">
              <span className="text-text-muted text-sm">Chat list here</span>
            </div>

            {/* Message view placeholder */}
            <div className="flex-1 bg-bg-primary flex items-center justify-center">
              <span className="text-text-muted text-sm">Messages here</span>
            </div>
          </>
        )}
      </div>

      {/* QR overlay placeholder */}
      {showQR && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center">
          <div className="bg-bg-secondary rounded-xl p-8 text-text-primary">
            <p className="mb-4">QR Scanner will appear here</p>
            <button
              onClick={() => setShowQR(false)}
              className="px-4 py-2 bg-accent-purple rounded-lg text-sm hover:opacity-90 transition-opacity cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Settings overlay placeholder */}
      {showSettings && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center">
          <div className="bg-bg-secondary rounded-xl p-8 text-text-primary">
            <p className="mb-4">Settings will appear here</p>
            <button
              onClick={() => setShowSettings(false)}
              className="px-4 py-2 bg-accent-purple rounded-lg text-sm hover:opacity-90 transition-opacity cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
