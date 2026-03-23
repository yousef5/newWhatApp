import { useState, useRef, useEffect } from 'react'
import type { Account } from '@shared/types'
import { getInitials } from '@/lib/utils'

interface AccountAvatarProps {
  account: Account
  isActive: boolean
  avatar?: string | null
  unreadCount?: number
  onClick: () => void
  onRename: (id: string, name: string) => void
  onChangeAvatar: (id: string) => void
  onRemoveAvatar: (id: string) => void
  onRemoveAccount: (id: string) => void
}

export default function AccountAvatar({
  account, isActive, avatar, unreadCount = 0, onClick,
  onRename, onChangeAvatar, onRemoveAvatar, onRemoveAccount,
}: AccountAvatarProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(account.name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setMenuPos({ x: e.clientX, y: e.clientY })
    setShowMenu(true)
  }

  const handleRename = () => {
    setShowMenu(false)
    setEditName(account.name)
    setEditing(true)
  }

  const submitRename = () => {
    const trimmed = editName.trim()
    if (trimmed && trimmed !== account.name) {
      onRename(account.id, trimmed)
    }
    setEditing(false)
  }

  // Show rename input
  if (editing) {
    return (
      <div className="w-[42px] shrink-0 flex flex-col items-center gap-1">
        <div
          className="w-[42px] h-[42px] flex items-center justify-center overflow-hidden border-2 border-accent-purple"
          style={{ borderRadius: '50%' }}
        >
          {avatar ? (
            <img src={avatar} alt="" className="w-full h-full object-cover" style={{ borderRadius: '50%' }} />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-sm font-bold font-mono"
              style={{ borderRadius: '50%', backgroundColor: account.avatarColor, color: '#fff' }}
            >
              {getInitials(account.name)}
            </div>
          )}
        </div>
        <input
          ref={inputRef}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={submitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitRename()
            if (e.key === 'Escape') setEditing(false)
          }}
          className="w-[54px] text-[8px] text-center bg-bg-tertiary border border-accent-purple text-text-primary px-1 py-0.5 font-mono outline-none"
        />
      </div>
    )
  }

  return (
    <div className="relative shrink-0">
      <button
        onClick={onClick}
        onContextMenu={handleContextMenu}
        className={`relative w-[42px] h-[42px] flex items-center justify-center cursor-pointer overflow-hidden ${
          isActive
            ? 'border-2 border-accent-purple'
            : 'border-2 border-transparent hover:border-border-secondary'
        }`}
        style={{ borderRadius: '50%' }}
        title={`${account.name} (right-click to edit)`}
      >
        {avatar || account.customAvatar ? (
          <img
            src={avatar || account.customAvatar}
            alt={account.name}
            className="w-full h-full object-cover"
            style={{ borderRadius: '50%' }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-sm font-bold font-mono"
            style={{
              borderRadius: '50%',
              backgroundColor: isActive ? account.avatarColor : '#141414',
              color: isActive ? '#fff' : '#888888',
            }}
          >
            {getInitials(account.name)}
          </div>
        )}

        {/* Unread badge */}
        {unreadCount > 0 && !isActive && (
          <div
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-accent-green flex items-center justify-center px-1"
            style={{ borderRadius: '9px', fontSize: '10px', fontWeight: 900, color: '#fff', fontFamily: 'monospace' }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </button>

      {/* Context menu */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div
            className="fixed z-50 bg-bg-secondary border-2 border-border-secondary py-1 min-w-[160px]"
            style={{ left: menuPos.x, top: menuPos.y }}
          >
            <button
              onClick={handleRename}
              className="w-full text-left px-3 py-1.5 text-[11px] text-text-primary hover:bg-bg-tertiary cursor-pointer font-mono border-b border-border-primary"
            >
              RENAME
            </button>
            <button
              onClick={() => { setShowMenu(false); onChangeAvatar(account.id) }}
              className="w-full text-left px-3 py-1.5 text-[11px] text-text-primary hover:bg-bg-tertiary cursor-pointer font-mono border-b border-border-primary"
            >
              CHANGE AVATAR
            </button>
            {(avatar || account.customAvatar) && (
              <button
                onClick={() => { setShowMenu(false); onRemoveAvatar(account.id) }}
                className="w-full text-left px-3 py-1.5 text-[11px] text-text-primary hover:bg-bg-tertiary cursor-pointer font-mono border-b border-border-primary"
              >
                REMOVE AVATAR
              </button>
            )}
            <button
              onClick={() => { setShowMenu(false); onRemoveAccount(account.id) }}
              className="w-full text-left px-3 py-1.5 text-[11px] text-accent-red hover:bg-bg-tertiary cursor-pointer font-mono"
            >
              REMOVE ACCOUNT
            </button>
          </div>
        </>
      )}
    </div>
  )
}
