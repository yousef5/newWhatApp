import { useState } from 'react'
import { useAccountsStore } from '@/stores/accounts'
import { useChatsStore } from '@/stores/chats'

interface ChatListHeaderProps {
  accountId: string
}

const FILTERS = ['all', 'unread', 'groups'] as const

export default function ChatListHeader({ accountId }: ChatListHeaderProps) {
  const account = useAccountsStore((s) => s.accounts.find((a) => a.id === accountId))
  const filter = useChatsStore((s) => s.filter)
  const setFilter = useChatsStore((s) => s.setFilter)
  const searchQuery = useChatsStore((s) => s.searchQuery)
  const setSearchQuery = useChatsStore((s) => s.setSearchQuery)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefreshAvatars = async () => {
    setRefreshing(true)
    try {
      await window.api.invoke('account:refetchAvatars', { accountId })
      // Reload chat list to pick up new avatars
      const chats = await window.api.invoke('chat:list', { accountId })
      useChatsStore.getState().setChats(chats)
    } catch (err) {
      console.error('Failed to refresh avatars:', err)
    }
    setRefreshing(false)
  }

  const connectionColor =
    account?.connectionState === 'open'
      ? 'text-accent-green'
      : account?.connectionState === 'connecting'
        ? 'text-yellow-500'
        : 'text-accent-red'

  const connectionText =
    account?.connectionState === 'open'
      ? 'Connected'
      : account?.connectionState === 'connecting'
        ? 'Connecting...'
        : 'Disconnected'

  return (
    <div className="px-3 pt-3 pb-2 space-y-2 shrink-0">
      {/* Account name + connection status + refresh */}
      <div className="flex items-center gap-2">
        <span className="text-[14px] font-bold text-text-primary truncate">
          {account?.name ?? 'Account'}
        </span>
        <span className={`text-[10px] ${connectionColor}`}>{connectionText}</span>
        <div className="flex-1" />
        <button
          onClick={handleRefreshAvatars}
          disabled={refreshing}
          title="Refresh avatars"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer disabled:opacity-50"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={refreshing ? 'animate-spin' : ''}
          >
            <polyline points="23,4 23,10 17,10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>
      </div>

      {/* Search input */}
      <input
        type="text"
        data-search-input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search or start new chat..."
        className="w-full px-3 py-1.5 text-xs bg-bg-secondary border border-border-primary rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-colors"
      />

      {/* Filter pills */}
      <div className="flex gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-[10px] rounded-full capitalize transition-colors cursor-pointer ${
              filter === f
                ? 'bg-accent-purple text-white'
                : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
            }`}
          >
            {f === 'all' ? 'All' : f === 'unread' ? 'Unread' : 'Groups'}
          </button>
        ))}
      </div>
    </div>
  )
}
