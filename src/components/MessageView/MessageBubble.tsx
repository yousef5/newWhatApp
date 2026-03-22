import type { Message } from '@shared/types'
import { formatFullTime, formatFileSize } from '@/lib/utils'
import FileImage from '@/components/shared/FileImage'
import Avatar from '@/components/shared/Avatar'

interface MessageBubbleProps {
  message: Message
  showSender?: boolean
  showAvatar?: boolean
  senderAvatarPath?: string | null
  onRetry?: (message: Message) => void
}

function StatusIcon({ status }: { status: Message['status'] }) {
  switch (status) {
    case 'pending': return <span className="text-white/40">&#9719;</span>
    case 'sent': return <span className="text-white/40">&#10003;</span>
    case 'delivered': return <span className="text-white/40">&#10003;&#10003;</span>
    case 'read': return <span className="text-accent-blue">&#10003;&#10003;</span>
    case 'failed': return <span className="text-accent-red font-bold">!</span>
    default: return null
  }
}

function displaySender(jid: string | null): string {
  if (!jid) return 'Unknown'
  if (!jid.includes('@')) return jid
  const raw = jid.split('@')[0]
  if (/^\d+$/.test(raw) && raw.length >= 10) {
    if (raw.startsWith('20')) return '+20 ' + raw.slice(2, 5) + ' ' + raw.slice(5, 8) + ' ' + raw.slice(8)
    return '+' + raw.slice(0, 3) + ' ' + raw.slice(3)
  }
  return raw
}

export default function MessageBubble({ message, showSender, showAvatar, senderAvatarPath, onRetry }: MessageBubbleProps) {
  const isOutgoing = message.isFromMe
  const isFailed = message.status === 'failed'
  const senderName = displaySender(message.senderJid)

  return (
    <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} px-4 py-[3px]`}>
      {/* Sender avatar (incoming only) */}
      {!isOutgoing && showAvatar && (
        <div className="mr-2 mt-auto mb-1 shrink-0">
          <Avatar
            filePath={senderAvatarPath}
            name={senderName}
            jid={message.senderJid || undefined}
            size={28}
          />
        </div>
      )}

      <div
        className={`relative max-w-[70%] min-w-[80px] px-2.5 py-1.5 border-2 ${
          isOutgoing
            ? 'bg-bubble-outgoing text-white border-accent-purple'
            : 'bg-bubble-incoming border-border-secondary text-text-primary'
        } ${isFailed ? 'opacity-60' : ''}`}
      >
        {/* Sender name */}
        {showSender && !isOutgoing && message.senderJid && (
          <div className="text-[11px] text-accent-purple font-bold mb-0.5 font-mono">
            {senderName}
          </div>
        )}

        {/* Quoted message */}
        {message.quotedMessagePreview && (
          <div className="bg-black/30 border-l-4 border-accent-purple px-2 py-1 mb-1.5">
            <span className="text-[11px] text-text-secondary line-clamp-2">{message.quotedMessagePreview}</span>
          </div>
        )}

        {/* Document */}
        {message.type === 'document' && (
          <div className="flex items-center gap-2 bg-black/20 px-3 py-2 mb-1.5 border border-border-primary">
            <div className="w-8 h-8 bg-accent-blue flex items-center justify-center text-[9px] text-white font-bold shrink-0 font-mono">DOC</div>
            <div className="min-w-0">
              <div className="text-[11px] truncate">{message.content || 'Document'}</div>
              {message.mediaSize && <div className="text-[9px] text-text-muted font-mono">{formatFileSize(message.mediaSize)}</div>}
            </div>
          </div>
        )}

        {/* Image */}
        {message.type === 'image' && (
          <div className="mb-1.5 overflow-hidden border border-border-primary relative">
            <FileImage
              filePath={message.mediaPath || message.thumbnailPath}
              className="max-w-[280px] max-h-64 object-cover"
              fallback="IMAGE"
            />
            {!message.mediaPath && message.thumbnailPath && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <span className="text-white text-[10px] font-mono bg-black/50 px-2 py-1">PREVIEW</span>
              </div>
            )}
          </div>
        )}

        {/* Video */}
        {message.type === 'video' && (
          <div className="mb-1.5 overflow-hidden border border-border-primary relative">
            <FileImage
              filePath={message.thumbnailPath}
              className="max-w-[280px] max-h-48 object-cover"
              fallback="VIDEO"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 bg-black/60 flex items-center justify-center border-2 border-white/50">
                <span className="text-white text-lg ml-0.5">&#9654;</span>
              </div>
            </div>
          </div>
        )}

        {/* Audio / Voice note */}
        {message.type === 'audio' && (
          <div className="mb-1.5 flex items-center gap-2 py-1 min-w-[180px]">
            <div className="w-9 h-9 bg-accent-green flex items-center justify-center text-white shrink-0">
              <span className="text-sm ml-0.5">&#9654;</span>
            </div>
            <div className="flex-1">
              <div className="h-[3px] bg-white/20"><div className="h-[3px] bg-accent-green w-0" /></div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-text-muted font-mono">VOICE NOTE</span>
                {message.mediaSize && <span className="text-[9px] text-text-muted font-mono">{formatFileSize(message.mediaSize)}</span>}
              </div>
            </div>
          </div>
        )}

        {/* Sticker */}
        {message.type === 'sticker' && (
          <div className="mb-1">
            <FileImage
              filePath={message.thumbnailPath || message.mediaPath}
              className="w-28 h-28 object-contain"
              fallback="STICKER"
            />
          </div>
        )}

        {/* Text */}
        {message.content && message.type !== 'document' && (
          <p className={`text-[13px] leading-[1.4] whitespace-pre-wrap break-words ${isOutgoing ? 'text-white' : 'text-text-primary'}`}>
            {message.content}
          </p>
        )}

        {/* Timestamp + status */}
        <div className={`flex items-center justify-end gap-1 mt-0.5 ${isOutgoing ? 'text-white/60' : 'text-text-muted'}`}>
          {isFailed && onRetry && (
            <button onClick={() => onRetry(message)} className="text-[9px] text-accent-red hover:underline cursor-pointer mr-1 font-mono uppercase font-bold">RETRY</button>
          )}
          <span className="text-[9px] font-mono font-bold">{formatFullTime(message.timestamp)}</span>
          {isOutgoing && <span className="text-[10px]"><StatusIcon status={message.status} /></span>}
        </div>
      </div>
    </div>
  )
}
