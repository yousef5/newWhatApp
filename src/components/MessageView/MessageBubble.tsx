import type { Message } from '@shared/types'
import { formatFullTime, formatFileSize } from '@/lib/utils'

interface MessageBubbleProps {
  message: Message
  showSender?: boolean
  onRetry?: (message: Message) => void
}

function StatusIcon({ status }: { status: Message['status'] }) {
  switch (status) {
    case 'pending':
      return <span className="text-white/40">&#9719;</span>
    case 'sent':
      return <span className="text-white/40">&#10003;</span>
    case 'delivered':
      return <span className="text-white/40">&#10003;&#10003;</span>
    case 'read':
      return <span className="text-accent-blue">&#10003;&#10003;</span>
    case 'failed':
      return <span className="text-accent-red font-bold">!</span>
    default:
      return null
  }
}

function formatSenderName(jid: string | null): string {
  if (!jid) return 'Unknown'
  // Remove the @s.whatsapp.net or @lid suffix
  const raw = jid.split('@')[0]
  // Format phone number with spaces for readability
  if (/^\d+$/.test(raw) && raw.length > 6) {
    return '+' + raw.replace(/(\d{2,3})(?=\d)/g, '$1 ').trim()
  }
  return raw
}

export default function MessageBubble({ message, showSender, onRetry }: MessageBubbleProps) {
  const isOutgoing = message.isFromMe
  const isFailed = message.status === 'failed'

  return (
    <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} px-4 py-[2px]`}>
      <div
        className={`relative max-w-[75%] min-w-[80px] px-2.5 py-1.5 ${
          isOutgoing
            ? 'bg-bubble-outgoing text-white rounded-lg rounded-tr-sm'
            : 'bg-bubble-incoming border border-border-primary text-text-primary rounded-lg rounded-tl-sm'
        } ${isFailed ? 'opacity-60' : ''}`}
      >
        {/* Sender name for group chats */}
        {showSender && !isOutgoing && message.senderJid && (
          <div className="text-[11px] text-accent-purple font-semibold mb-0.5">
            {message.senderJid.includes('@') ? formatSenderName(message.senderJid) : message.senderJid}
          </div>
        )}

        {/* Quoted message */}
        {message.quotedMessagePreview && (
          <div className="bg-black/20 border-l-2 border-accent-purple rounded px-2 py-1 mb-1.5">
            <span className="text-[11px] text-text-secondary line-clamp-2">
              {message.quotedMessagePreview}
            </span>
          </div>
        )}

        {/* Document card */}
        {message.type === 'document' && (
          <div className="flex items-center gap-2 bg-black/15 rounded-lg px-3 py-2 mb-1.5">
            <div className="w-8 h-8 bg-accent-blue rounded-md flex items-center justify-center text-[9px] text-white font-bold shrink-0">
              DOC
            </div>
            <div className="min-w-0">
              <div className="text-[11px] truncate">
                {message.content || 'Document'}
              </div>
              {message.mediaSize && (
                <div className="text-[9px] text-text-muted">
                  {formatFileSize(message.mediaSize)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Image */}
        {message.type === 'image' && (
          <div className="mb-1.5 rounded-lg overflow-hidden">
            {(message.thumbnailPath || message.mediaPath) ? (
              <img src={`local-file://${message.thumbnailPath || message.mediaPath}`} alt="" className="max-w-full rounded-lg max-h-64 object-cover" />
            ) : (
              <div className="w-48 h-32 bg-black/20 rounded-lg flex items-center justify-center text-text-muted text-xs">
                Loading image...
              </div>
            )}
          </div>
        )}

        {/* Video */}
        {message.type === 'video' && (
          <div className="mb-1.5 w-48 h-32 bg-black/20 rounded-lg flex items-center justify-center text-text-muted text-xs">
            Video
          </div>
        )}

        {/* Audio player */}
        {message.type === 'audio' && (
          <div className="mb-1.5 flex items-center gap-2">
            <div className="w-8 h-8 bg-accent-green rounded-full flex items-center justify-center text-white text-xs shrink-0">
              &#9654;
            </div>
            <div className="flex-1 h-1 bg-white/20 rounded-full">
              <div className="h-1 bg-white/50 rounded-full w-0" />
            </div>
          </div>
        )}

        {/* Sticker indicator */}
        {message.type === 'sticker' && (
          <div className="text-[11px] text-text-muted italic mb-0.5">[sticker]</div>
        )}

        {/* Text content */}
        {message.content && message.type !== 'document' && (
          <p className={`text-[13px] leading-[1.4] whitespace-pre-wrap break-words ${
            isOutgoing ? 'text-white' : 'text-text-primary'
          }`}>
            {message.content}
          </p>
        )}

        {/* Timestamp + status */}
        <div className={`flex items-center justify-end gap-1 mt-0.5 ${
          isOutgoing ? 'text-white/50' : 'text-text-muted'
        }`}>
          {isFailed && onRetry && (
            <button
              onClick={() => onRetry(message)}
              className="text-[9px] text-accent-red hover:underline cursor-pointer mr-1"
            >
              Retry
            </button>
          )}
          <span className="text-[9px]">
            {formatFullTime(message.timestamp)}
          </span>
          {isOutgoing && (
            <span className="text-[10px]">
              <StatusIcon status={message.status} />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
