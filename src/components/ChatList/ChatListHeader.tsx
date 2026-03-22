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
      {/* Account name + connection status */}
      <div className="flex items-center gap-2">
        <span className="text-[14px] font-bold text-text-primary truncate">
          {account?.name ?? 'Account'}
        </span>
        <span className={`text-[10px] ${connectionColor}`}>{connectionText}</span>
      </div>

      {/* Search input */}
      <input
        type="text"
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
