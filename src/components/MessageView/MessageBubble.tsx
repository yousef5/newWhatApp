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
      return <span className="text-text-muted">&#9719;</span> // clock symbol
    case 'sent':
      return <span className="text-text-muted">&#10003;</span>
    case 'delivered':
      return <span className="text-text-muted">&#10003;&#10003;</span>
    case 'read':
      return <span className="text-accent-blue">&#10003;&#10003;</span>
    case 'failed':
      return <span className="text-accent-red">!</span>
    default:
      return null
  }
}

export default function MessageBubble({ message, showSender, onRetry }: MessageBubbleProps) {
  const isOutgoing = message.isFromMe
  const isFailed = message.status === 'failed'

  return (
    <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} px-4 py-0.5`}>
      <div
        className={`max-w-[65%] px-3 py-1.5 ${
          isOutgoing
            ? 'bg-bubble-outgoing rounded-xl rounded-tr-sm'
            : 'bg-bubble-incoming border border-border-primary rounded-xl rounded-tl-sm'
        } ${isFailed ? 'opacity-70' : ''}`}
      >
        {/* Sender name for group chats */}
        {showSender && !isOutgoing && message.senderJid && (
          <div className="text-[10px] text-accent-purple font-medium mb-0.5 truncate">
            {message.senderJid.split('@')[0]}
          </div>
        )}

        {/* Quoted message */}
        {message.quotedMessagePreview && (
          <div className="bg-black/20 border-l-2 border-accent-purple rounded px-2 py-1 mb-1">
            <span className="text-[10px] text-text-secondary line-clamp-2">
              {message.quotedMessagePreview}
            </span>
          </div>
        )}

        {/* Document card */}
        {message.type === 'document' && message.mediaPath && (
          <div className="flex items-center gap-2 bg-black/10 rounded-lg px-3 py-2 mb-1">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-secondary shrink-0">
              <path d="M4 2h8l4 4v12H4V2z" />
              <polyline points="12,2 12,6 16,6" />
            </svg>
            <div className="min-w-0">
              <div className="text-[11px] text-text-primary truncate">
                {message.mediaPath.split('/').pop() ?? 'Document'}
              </div>
              {message.mediaSize && (
                <div className="text-[9px] text-text-muted">
                  {formatFileSize(message.mediaSize)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Image thumbnail */}
        {message.type === 'image' && message.thumbnailPath && (
          <div className="mb-1 rounded-lg overflow-hidden">
            <img
              src={`local://${message.thumbnailPath}`}
              alt=""
              className="max-w-full rounded-lg"
              loading="lazy"
            />
          </div>
        )}

        {/* Audio player */}
        {message.type === 'audio' && message.mediaPath && (
          <div className="mb-1">
            <audio
              controls
              src={`local://${message.mediaPath}`}
              className="h-8 max-w-full"
              preload="metadata"
            />
          </div>
        )}

        {/* Text content */}
        {message.content && (
          <p className="text-[12px] text-text-primary whitespace-pre-wrap break-words">
            {message.content}
          </p>
        )}

        {/* Timestamp + status + retry */}
        <div className="flex items-center justify-end gap-1 mt-0.5">
          {isFailed && onRetry && (
            <button
              onClick={() => onRetry(message)}
              className="text-[9px] text-accent-red hover:underline cursor-pointer mr-1"
            >
              Retry
            </button>
          )}
          <span className="text-[9px] text-text-muted">
            {formatFullTime(message.timestamp)}
          </span>
          {isOutgoing && (
            <span className="text-[9px]">
              <StatusIcon status={message.status} />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
