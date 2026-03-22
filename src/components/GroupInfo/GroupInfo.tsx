import { useState, useEffect, useCallback } from 'react'
import { getInitials } from '@/lib/utils'
import type { GroupMetadata, GroupParticipant } from '@shared/types'

interface GroupInfoProps {
  accountId: string
  chatJid: string
  onClose: () => void
}

export default function GroupInfo({ accountId, chatJid, onClose }: GroupInfoProps) {
  const [groupInfo, setGroupInfo] = useState<GroupMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingSubject, setEditingSubject] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [subjectDraft, setSubjectDraft] = useState('')
  const [descDraft, setDescDraft] = useState('')

  const loadGroupInfo = useCallback(async () => {
    try {
      setLoading(true)
      const info = await window.api.invoke('group:info', { accountId, jid: chatJid })
      setGroupInfo(info)
    } catch (err) {
      console.error('Failed to load group info:', err)
    } finally {
      setLoading(false)
    }
  }, [accountId, chatJid])

  useEffect(() => {
    loadGroupInfo()
  }, [loadGroupInfo])

  const handleUpdateSubject = useCallback(async () => {
    if (!subjectDraft.trim()) return
    try {
      await window.api.invoke('group:updateSubject', { accountId, jid: chatJid, subject: subjectDraft.trim() })
      setGroupInfo((prev) => prev ? { ...prev, subject: subjectDraft.trim() } : prev)
      setEditingSubject(false)
    } catch (err) {
      console.error('Failed to update subject:', err)
    }
  }, [accountId, chatJid, subjectDraft])

  const handleUpdateDescription = useCallback(async () => {
    try {
      await window.api.invoke('group:updateDescription', { accountId, jid: chatJid, description: descDraft.trim() })
      setGroupInfo((prev) => prev ? { ...prev, description: descDraft.trim() } : prev)
      setEditingDesc(false)
    } catch (err) {
      console.error('Failed to update description:', err)
    }
  }, [accountId, chatJid, descDraft])

  const handleRemoveParticipant = useCallback(async (participantJid: string) => {
    try {
      await window.api.invoke('group:removeParticipant', { accountId, jid: chatJid, participantJid })
      setGroupInfo((prev) => prev ? {
        ...prev,
        participants: prev.participants.filter((p) => p.jid !== participantJid),
        participantCount: prev.participantCount - 1,
      } : prev)
    } catch (err) {
      console.error('Failed to remove participant:', err)
    }
  }, [accountId, chatJid])

  const handlePromoteAdmin = useCallback(async (participantJid: string) => {
    try {
      await window.api.invoke('group:promoteAdmin', { accountId, jid: chatJid, participantJid })
      setGroupInfo((prev) => prev ? {
        ...prev,
        participants: prev.participants.map((p) =>
          p.jid === participantJid ? { ...p, admin: true } : p
        ),
      } : prev)
    } catch (err) {
      console.error('Failed to promote admin:', err)
    }
  }, [accountId, chatJid])

  const handleDemoteAdmin = useCallback(async (participantJid: string) => {
    try {
      await window.api.invoke('group:demoteAdmin', { accountId, jid: chatJid, participantJid })
      setGroupInfo((prev) => prev ? {
        ...prev,
        participants: prev.participants.map((p) =>
          p.jid === participantJid ? { ...p, admin: false } : p
        ),
      } : prev)
    } catch (err) {
      console.error('Failed to demote admin:', err)
    }
  }, [accountId, chatJid])

  // Check if current user is admin (we don't know our own jid easily, so we just show all buttons if any admin exists)
  // In a real app, you'd check if the current user's jid is in the admin list
  const isAdmin = true // Simplified: show admin actions always, server will reject if not authorized

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-80 h-full bg-bg-secondary border-l-2 border-accent-purple overflow-y-auto scrollbar-thin">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-bg-secondary border-b-2 border-border-secondary px-4 py-3 flex items-center gap-3">
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-tertiary cursor-pointer border border-border-primary"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="1" y1="1" x2="13" y2="13" />
              <line x1="13" y1="1" x2="1" y2="13" />
            </svg>
          </button>
          <h2 className="text-sm font-bold text-text-primary uppercase font-mono tracking-wide">GROUP INFO</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-accent-purple border-t-transparent animate-spin" />
          </div>
        ) : groupInfo ? (
          <div className="p-4 space-y-4">
            {/* Group avatar + subject */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 bg-accent-blue flex items-center justify-center text-white text-xl font-bold font-mono border-2 border-border-secondary">
                {getInitials(groupInfo.subject || 'Group')}
              </div>

              {editingSubject ? (
                <div className="flex items-center gap-2 w-full">
                  <input
                    value={subjectDraft}
                    onChange={(e) => setSubjectDraft(e.target.value)}
                    className="flex-1 bg-bg-primary border-2 border-border-primary px-2 py-1 text-sm text-text-primary focus:outline-none focus:border-accent-purple font-mono"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateSubject()}
                  />
                  <button
                    onClick={handleUpdateSubject}
                    className="text-xs text-accent-green hover:underline cursor-pointer font-mono font-bold uppercase"
                  >
                    SAVE
                  </button>
                  <button
                    onClick={() => setEditingSubject(false)}
                    className="text-xs text-text-muted hover:underline cursor-pointer font-mono uppercase"
                  >
                    CANCEL
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-text-primary uppercase font-mono">
                    {groupInfo.subject || 'UNNAMED GROUP'}
                  </h3>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setSubjectDraft(groupInfo.subject || '')
                        setEditingSubject(true)
                      }}
                      className="text-text-muted hover:text-text-secondary cursor-pointer"
                      title="Edit group name"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8.5 1.5l2 2L3.5 10.5H1.5v-2z" />
                      </svg>
                    </button>
                  )}
                </div>
              )}

              <span className="text-xs text-text-muted font-mono uppercase">
                {groupInfo.participantCount} PARTICIPANTS
              </span>
            </div>

            {/* Description */}
            <div className="space-y-1 border-2 border-border-primary p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted font-bold font-mono uppercase">DESCRIPTION</span>
                {isAdmin && !editingDesc && (
                  <button
                    onClick={() => {
                      setDescDraft(groupInfo.description || '')
                      setEditingDesc(true)
                    }}
                    className="text-xs text-accent-purple hover:underline cursor-pointer font-mono font-bold uppercase"
                  >
                    EDIT
                  </button>
                )}
              </div>
              {editingDesc ? (
                <div className="space-y-2">
                  <textarea
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    className="w-full bg-bg-primary border-2 border-border-primary px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent-purple resize-none font-mono"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdateDescription}
                      className="text-xs text-accent-green hover:underline cursor-pointer font-mono font-bold uppercase"
                    >
                      SAVE
                    </button>
                    <button
                      onClick={() => setEditingDesc(false)}
                      className="text-xs text-text-muted hover:underline cursor-pointer font-mono uppercase"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-text-secondary font-mono">
                  {groupInfo.description || 'No description'}
                </p>
              )}
            </div>

            {/* Participants */}
            <div className="space-y-2">
              <span className="text-xs text-text-muted font-bold font-mono uppercase">
                PARTICIPANTS ({groupInfo.participants.length})
              </span>
              <div className="space-y-1 border-2 border-border-primary">
                {groupInfo.participants.map((participant) => (
                  <ParticipantRow
                    key={participant.jid}
                    participant={participant}
                    isAdmin={isAdmin}
                    onRemove={() => handleRemoveParticipant(participant.jid)}
                    onPromote={() => handlePromoteAdmin(participant.jid)}
                    onDemote={() => handleDemoteAdmin(participant.jid)}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <span className="text-sm text-text-muted font-mono uppercase">FAILED TO LOAD GROUP INFO</span>
          </div>
        )}
      </div>
    </div>
  )
}

function ParticipantRow({
  participant,
  isAdmin,
  onRemove,
  onPromote,
  onDemote,
}: {
  participant: GroupParticipant
  isAdmin: boolean
  onRemove: () => void
  onPromote: () => void
  onDemote: () => void
}) {
  const [showActions, setShowActions] = useState(false)
  const phoneNumber = participant.jid.split('@')[0]

  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 hover:bg-bg-tertiary group border-b border-border-primary last:border-b-0"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="w-7 h-7 bg-bg-tertiary flex items-center justify-center text-text-muted text-[10px] font-bold shrink-0 font-mono border border-border-secondary">
        {phoneNumber.slice(-2)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-xs text-text-primary truncate font-mono">{phoneNumber}</span>
          {participant.admin && (
            <span className="text-[9px] px-1 py-0.5 bg-accent-purple text-white font-bold shrink-0 font-mono uppercase">
              ADMIN
            </span>
          )}
        </div>
      </div>

      {/* Admin actions */}
      {isAdmin && showActions && (
        <div className="flex items-center gap-1 shrink-0">
          {participant.admin ? (
            <button
              onClick={onDemote}
              className="text-[9px] px-1.5 py-0.5 bg-bg-primary text-text-muted hover:text-text-secondary cursor-pointer border border-border-primary font-mono uppercase"
              title="Demote from admin"
            >
              DEMOTE
            </button>
          ) : (
            <button
              onClick={onPromote}
              className="text-[9px] px-1.5 py-0.5 bg-bg-primary text-text-muted hover:text-accent-purple cursor-pointer border border-border-primary font-mono uppercase"
              title="Make admin"
            >
              PROMOTE
            </button>
          )}
          <button
            onClick={onRemove}
            className="text-[9px] px-1.5 py-0.5 bg-bg-primary text-text-muted hover:text-accent-red cursor-pointer border border-border-primary font-mono uppercase"
            title="Remove from group"
          >
            REMOVE
          </button>
        </div>
      )}
    </div>
  )
}
