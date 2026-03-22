import { useState, useCallback } from 'react'
import { useAccounts } from '@/hooks/useAccounts'
import { useAccountsStore } from '@/stores/accounts'
import { useChatsStore } from '@/stores/chats'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import AccountSidebar from '@/components/AccountSidebar/AccountSidebar'
import ConnectionBanner from '@/components/shared/ConnectionBanner'
import EmptyState from '@/components/shared/EmptyState'
import ChatList from '@/components/ChatList/ChatList'
import MessageView from '@/components/MessageView/MessageView'
import QRLogin from '@/components/QRLogin/QRLogin'
import Settings from '@/components/Settings/Settings'

export default function App() {
  const { accounts, activeAccountId, switchAccount } = useAccounts()
  const activeChatJid = useChatsStore((s) => s.activeChatJid)
  const setActiveChat = useChatsStore((s) => s.setActiveChat)
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

  const handleQRConnected = useCallback(() => {
    setShowQR(false)
    // Reload accounts to pick up the new one
    window.api
      .invoke('account:list', undefined)
      .then((accountList) => {
        useAccountsStore.getState().setAccounts(accountList)
        // Switch to the newest account
        if (accountList.length > 0) {
          switchAccount(accountList[accountList.length - 1].id)
        }
      })
      .catch(console.error)
  }, [switchAccount])

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNextAccount: useCallback(() => {
      if (accounts.length === 0) return
      const currentIdx = accounts.findIndex((a) => a.id === activeAccountId)
      const nextIdx = (currentIdx + 1) % accounts.length
      switchAccount(accounts[nextIdx].id)
    }, [accounts, activeAccountId, switchAccount]),

    onPrevAccount: useCallback(() => {
      if (accounts.length === 0) return
      const currentIdx = accounts.findIndex((a) => a.id === activeAccountId)
      const prevIdx = (currentIdx - 1 + accounts.length) % accounts.length
      switchAccount(accounts[prevIdx].id)
    }, [accounts, activeAccountId, switchAccount]),

    onSearch: useCallback(() => {
      // Focus the search input in the ChatList
      const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]')
      if (searchInput) {
        searchInput.focus()
      }
    }, []),

    onEscape: useCallback(() => {
      if (showSettings) {
        setShowSettings(false)
      } else if (showQR) {
        setShowQR(false)
      } else if (activeChatJid) {
        setActiveChat(null)
      }
    }, [showSettings, showQR, activeChatJid, setActiveChat]),

    onSwitchAccount: useCallback((index: number) => {
      if (index < accounts.length) {
        switchAccount(accounts[index].id)
      }
    }, [accounts, switchAccount]),
  })

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
            {/* Chat list */}
            {activeAccountId && <ChatList accountId={activeAccountId} />}

            {/* Message view or empty state */}
            {activeAccountId && activeChatJid ? (
              <MessageView accountId={activeAccountId} chatJid={activeChatJid} />
            ) : (
              <EmptyState
                title="Select a chat"
                subtitle="Choose a conversation from the list to start messaging"
              />
            )}
          </>
        )}
      </div>

      {/* QR Login overlay */}
      {showQR && (
        <QRLogin
          onClose={() => setShowQR(false)}
          onConnected={handleQRConnected}
        />
      )}

      {/* Settings overlay */}
      {showSettings && (
        <Settings onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}
