import { useState } from 'react'
import { useIPCEvent } from '@/hooks/useIPC'
import { getInitials } from '@/lib/utils'
import GroupInfo from '@/components/GroupInfo/GroupInfo'
import type { PresenceData } from '@shared/types'

interface ChatHeaderProps {
  accountId: string
  chatJid: string
  chatName: string
  isGroup: boolean
  profilePicture?: string | null
  onExportChat?: () => void
  onStarredMessages?: () => void
}

export default function ChatHeader({ accountId, chatJid, chatName, isGroup, profilePicture, onExportChat, onStarredMessages }: ChatHeaderProps) {
  const [presence, setPresence] = useState<PresenceData | null>(null)
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  useIPCEvent('presence:update', (data) => {
    if (data.accountId === accountId && data.jid === chatJid) {
      setPresence(data.presence)
    }
  })

  const presenceText =
    presence?.lastKnownPresence === 'composing'
      ? 'typing...'
      : presence?.lastKnownPresence === 'recording'
        ? 'recording audio...'
        : presence?.lastKnownPresence === 'available'
          ? 'online'
          : null

  return (
    <>
      <div className="h-14 px-4 flex items-center gap-3 border-b border-border-primary bg-bg-secondary shrink-0">
        {/* Avatar */}
        {profilePicture ? (
          <img src={`file://${profilePicture}`} alt="" className="w-9 h-9 rounded-full shrink-0 object-cover" />
        ) : (
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 ${
              isGroup ? 'bg-accent-blue' : 'bg-bg-tertiary'
            }`}
          >
            {getInitials(chatName)}
          </div>
        )}

        {/* Name + presence */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => isGroup && setShowGroupInfo(true)}
        >
          <div className="text-[13px] font-semibold text-text-primary truncate">{chatName}</div>
          {presenceText && (
            <div className="text-[10px] text-accent-green">{presenceText}</div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {/* Search icon */}
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-secondary hover:bg-bg-tertiary transition-colors cursor-pointer">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="7" cy="7" r="5" />
              <line x1="11" y1="11" x2="14" y2="14" />
            </svg>
          </button>
          {/* Attach icon */}
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-secondary hover:bg-bg-tertiary transition-colors cursor-pointer">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 8l-5.3 5.3a3.5 3.5 0 0 1-5 0 3.5 3.5 0 0 1 0-5L9 3a2.3 2.3 0 0 1 3.3 0 2.3 2.3 0 0 1 0 3.3L7 11.6a1.2 1.2 0 0 1-1.7 0 1.2 1.2 0 0 1 0-1.7L10 5.2" />
            </svg>
          </button>
          {/* Menu button */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-secondary hover:bg-bg-tertiary transition-colors cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="8" cy="3" r="1.5" />
                <circle cx="8" cy="8" r="1.5" />
                <circle cx="8" cy="13" r="1.5" />
              </svg>
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-10 z-50 bg-bg-secondary border border-border-primary rounded-lg shadow-lg py-1 min-w-[160px]">
                  {onStarredMessages && (
                    <button
                      onClick={() => { setShowMenu(false); onStarredMessages() }}
                      className="w-full text-left px-3 py-2 text-xs text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
                    >
                      Starred messages
                    </button>
                  )}
                  {onExportChat && (
                    <button
                      onClick={() => { setShowMenu(false); onExportChat() }}
                      className="w-full text-left px-3 py-2 text-xs text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
                    >
                      Export chat
                    </button>
                  )}
                  {isGroup && (
                    <button
                      onClick={() => { setShowMenu(false); setShowGroupInfo(true) }}
                      className="w-full text-left px-3 py-2 text-xs text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
                    >
                      Group info
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Group Info panel */}
      {showGroupInfo && isGroup && (
        <GroupInfo
          accountId={accountId}
          chatJid={chatJid}
          onClose={() => setShowGroupInfo(false)}
        />
      )}
    </>
  )
}
