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
    if (trimmed && trimmed !== account.name) onRename(account.id, trimmed)
    setEditing(false)
  }

  const imgSrc = avatar || account.customAvatar

  if (editing) {
    return (
      <div className="w-full shrink-0 flex flex-col items-center gap-1 py-1">
        <div className="w-[44px] h-[44px] overflow-hidden" style={{ borderRadius: '50%', border: '2px solid #a855f7' }}>
          {imgSrc ? (
            <img src={imgSrc} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm font-bold font-mono" style={{ backgroundColor: account.avatarColor, color: '#fff' }}>
              {getInitials(account.name)}
            </div>
          )}
        </div>
        <input
          ref={inputRef}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={submitRename}
          onKeyDown={(e) => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') setEditing(false) }}
          className="w-[54px] text-[8px] text-center bg-bg-tertiary border border-accent-purple text-text-primary px-1 py-0.5 font-mono outline-none"
        />
      </div>
    )
  }

  return (
    <div className="relative shrink-0 w-full flex flex-col items-center py-1">
      {/* Unread badge */}
      {unreadCount > 0 && (
        <div className="w-full flex items-center justify-center gap-[3px] mb-1"
          style={{
            height: '16px',
            background: 'linear-gradient(180deg, rgba(34,197,94,0.12) 0%, transparent 100%)',
          }}
        >
          <svg width="8" height="8" viewBox="0 0 16 16" fill="#22c55e">
            <path d="M8 1.5a.5.5 0 0 1 .5.5v.6A4 4 0 0 1 12 7v2.5l1.3 1.9a.5.5 0 0 1-.4.8H3.1a.5.5 0 0 1-.4-.8L4 9.5V7a4 4 0 0 1 3.5-3.9V2a.5.5 0 0 1 .5-.5zM6.5 13h3a1.5 1.5 0 0 1-3 0z"/>
          </svg>
          <span style={{ fontSize: '9px', fontWeight: 900, fontFamily: 'monospace', color: '#22c55e', textShadow: '0 0 4px rgba(34,197,94,0.5)' }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        </div>
      )}

      {/* Active indicator — left bar */}
      {isActive && (
        <div
          className="absolute left-0 top-1/2"
          style={{
            width: '3px',
            height: '28px',
            transform: 'translateY(-50%)',
            background: 'linear-gradient(180deg, #a855f7 0%, #7c3aed 100%)',
            boxShadow: '0 0 8px rgba(168,85,247,0.6)',
          }}
        />
      )}

      {/* Avatar button */}
      <button
        onClick={onClick}
        onContextMenu={handleContextMenu}
        className="relative cursor-pointer group"
        title={`${account.name} (right-click to edit)`}
        style={{ outline: 'none' }}
      >
        {/* Glow ring for active */}
        <div
          className="w-[46px] h-[46px] flex items-center justify-center transition-all duration-200"
          style={{
            borderRadius: '50%',
            background: isActive
              ? 'linear-gradient(135deg, #a855f7, #3b82f6)'
              : 'transparent',
            padding: isActive ? '2px' : '0',
          }}
        >
          <div
            className="w-full h-full overflow-hidden transition-all duration-200"
            style={{
              borderRadius: '50%',
              border: isActive ? '2px solid #000' : '2px solid transparent',
              transform: isActive ? 'scale(1)' : 'scale(0.9)',
              opacity: isActive ? 1 : 0.7,
            }}
          >
            {imgSrc ? (
              <img src={imgSrc} alt={account.name} className="w-full h-full object-cover" style={{ borderRadius: '50%' }} />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center font-bold font-mono"
                style={{
                  borderRadius: '50%',
                  backgroundColor: account.avatarColor,
                  color: '#fff',
                  fontSize: '14px',
                }}
              >
                {getInitials(account.name)}
              </div>
            )}
          </div>
        </div>

        {/* Hover overlay */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center pointer-events-none"
          style={{
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.3)',
          }}
        />
      </button>

      {/* Name label for active account */}
      {isActive && (
        <div className="mt-1 w-full text-center">
          <span style={{ fontSize: '7px', fontWeight: 700, fontFamily: 'monospace', color: '#a855f7', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            {account.name.length > 8 ? account.name.slice(0, 8) : account.name}
          </span>
        </div>
      )}

      {/* Context menu */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div
            className="fixed z-50 bg-bg-secondary border-2 border-border-secondary py-1 min-w-[160px]"
            style={{ left: menuPos.x, top: menuPos.y }}
          >
            <button onClick={handleRename} className="w-full text-left px-3 py-1.5 text-[11px] text-text-primary hover:bg-bg-tertiary cursor-pointer font-mono border-b border-border-primary">
              RENAME
            </button>
            <button onClick={() => { setShowMenu(false); onChangeAvatar(account.id) }} className="w-full text-left px-3 py-1.5 text-[11px] text-text-primary hover:bg-bg-tertiary cursor-pointer font-mono border-b border-border-primary">
              CHANGE AVATAR
            </button>
            {imgSrc && (
              <button onClick={() => { setShowMenu(false); onRemoveAvatar(account.id) }} className="w-full text-left px-3 py-1.5 text-[11px] text-text-primary hover:bg-bg-tertiary cursor-pointer font-mono border-b border-border-primary">
                REMOVE AVATAR
              </button>
            )}
            <button onClick={() => { setShowMenu(false); onRemoveAccount(account.id) }} className="w-full text-left px-3 py-1.5 text-[11px] text-accent-red hover:bg-bg-tertiary cursor-pointer font-mono">
              REMOVE ACCOUNT
            </button>
          </div>
        </>
      )}
    </div>
  )
}
