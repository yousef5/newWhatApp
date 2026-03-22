import { useState, useRef, useCallback, type KeyboardEvent } from 'react'
import VoiceRecorder from './VoiceRecorder'

interface MessageInputProps {
  onSend: (text: string) => void
  onAttach: () => void
  onSendVoice?: (blob: Blob) => void
}

export default function MessageInput({ onSend, onAttach, onSendVoice }: MessageInputProps) {
  const [text, setText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed) return
    onSend(trimmed)
    setText('')
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [text, onSend])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const handleInput = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [])

  const handleVoiceSend = useCallback(
    (blob: Blob) => {
      setIsRecording(false)
      if (onSendVoice) {
        onSendVoice(blob)
      }
    },
    [onSendVoice]
  )

  const handleVoiceCancel = useCallback(() => {
    setIsRecording(false)
  }, [])

  const hasText = text.trim().length > 0

  // Show VoiceRecorder when recording
  if (isRecording) {
    return <VoiceRecorder onSend={handleVoiceSend} onCancel={handleVoiceCancel} />
  }

  return (
    <div className="px-4 py-3 border-t border-border-primary bg-bg-secondary flex items-end gap-2 shrink-0">
      {/* Emoji button */}
      <button className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-secondary hover:bg-bg-tertiary transition-colors cursor-pointer shrink-0 mb-0.5">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="9" cy="9" r="7.5" />
          <path d="M6 10.5s1 1.5 3 1.5 3-1.5 3-1.5" />
          <circle cx="6.5" cy="7" r="0.5" fill="currentColor" stroke="none" />
          <circle cx="11.5" cy="7" r="0.5" fill="currentColor" stroke="none" />
        </svg>
      </button>

      {/* Attach button */}
      <button
        onClick={onAttach}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-secondary hover:bg-bg-tertiary transition-colors cursor-pointer shrink-0 mb-0.5"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15.5 8.5l-6 6a4 4 0 0 1-5.7 0 4 4 0 0 1 0-5.7l6-6a2.7 2.7 0 0 1 3.8 0 2.7 2.7 0 0 1 0 3.8l-6 6a1.3 1.3 0 0 1-1.9 0 1.3 1.3 0 0 1 0-1.9l5.5-5.5" />
        </svg>
      </button>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        rows={1}
        placeholder="Type a message..."
        className="flex-1 bg-bg-secondary border border-border-primary rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:border-accent-purple transition-colors scrollbar-thin"
        style={{ maxHeight: 120 }}
      />

      {/* Send / Mic button */}
      {hasText ? (
        <button
          onClick={handleSend}
          className="w-8 h-8 rounded-lg bg-accent-purple flex items-center justify-center text-white hover:opacity-90 transition-opacity cursor-pointer shrink-0 mb-0.5"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1.5 1.3L14.7 7.5c.4.2.4.8 0 1L1.5 14.7c-.5.2-1-.2-.9-.7L2 9l7.5-1L2 7 .6 2c-.1-.5.4-.9.9-.7z" />
          </svg>
        </button>
      ) : (
        <button
          onMouseDown={() => setIsRecording(true)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-secondary hover:bg-bg-tertiary transition-colors cursor-pointer shrink-0 mb-0.5"
          title="Hold to record voice note"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 1v8" />
            <path d="M5 5a4 4 0 0 0 8 0" transform="translate(0 4)" />
            <line x1="9" y1="13" x2="9" y2="17" />
            <line x1="6" y1="17" x2="12" y2="17" />
          </svg>
        </button>
      )}
    </div>
  )
}
