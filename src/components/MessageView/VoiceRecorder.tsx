import { useState, useEffect, useRef, useCallback } from 'react'

interface VoiceRecorderProps {
  onSend: (blob: Blob) => void
  onCancel: () => void
}

export default function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const [duration, setDuration] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const MAX_DURATION = 15 * 60 // 15 minutes in seconds

  const stopRecording = useCallback(
    (send: boolean) => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      const recorder = mediaRecorderRef.current
      if (recorder && recorder.state !== 'inactive') {
        // Attach the onstop handler before calling stop
        recorder.onstop = () => {
          if (send && chunksRef.current.length > 0) {
            const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' })
            onSend(blob)
          } else {
            onCancel()
          }
          // Cleanup stream
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop())
            streamRef.current = null
          }
        }
        recorder.stop()
      } else {
        // No recorder running
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop())
          streamRef.current = null
        }
        onCancel()
      }
    },
    [onSend, onCancel]
  )

  useEffect(() => {
    let cancelled = false

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream

        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
        mediaRecorderRef.current = recorder
        chunksRef.current = []

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data)
          }
        }

        recorder.start(100) // collect data every 100ms

        // Duration timer
        timerRef.current = setInterval(() => {
          setDuration((prev) => {
            if (prev + 1 >= MAX_DURATION) {
              // Auto-stop at max duration
              stopRecording(true)
              return prev + 1
            }
            return prev + 1
          })
        }, 1000)
      })
      .catch((err) => {
        console.error('Failed to access microphone:', err)
        onCancel()
      })

    return () => {
      cancelled = true
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopRecording(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [stopRecording])

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="px-4 py-3 border-t border-border-primary bg-bg-secondary flex items-center gap-3 shrink-0">
      {/* Recording indicator */}
      <div className="flex items-center gap-2 flex-1">
        <div className="w-3 h-3 rounded-full bg-accent-red animate-pulse" />
        <span className="text-[12px] text-accent-red font-medium">Recording...</span>
        <span className="text-[12px] text-text-muted font-mono">{formatDuration(duration)}</span>
      </div>

      {/* Cancel button */}
      <button
        onClick={() => stopRecording(false)}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-accent-red hover:bg-bg-tertiary transition-colors cursor-pointer"
        title="Cancel"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="3" x2="13" y2="13" />
          <line x1="13" y1="3" x2="3" y2="13" />
        </svg>
      </button>

      {/* Send button */}
      <button
        onClick={() => stopRecording(true)}
        className="w-8 h-8 rounded-lg bg-accent-purple flex items-center justify-center text-white hover:opacity-90 transition-opacity cursor-pointer"
        title="Send voice note"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M1.5 1.3L14.7 7.5c.4.2.4.8 0 1L1.5 14.7c-.5.2-1-.2-.9-.7L2 9l7.5-1L2 7 .6 2c-.1-.5.4-.9.9-.7z" />
        </svg>
      </button>
    </div>
  )
}
