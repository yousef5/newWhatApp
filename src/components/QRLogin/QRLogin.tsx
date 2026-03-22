import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { useIPCEvent } from '@/hooks/useIPC'

interface QRLoginProps {
  onClose: () => void
  onConnected: () => void
}

type QRState = 'loading' | 'qr' | 'expired' | 'connected'

const QR_EXPIRY_MS = 60_000 // 60 seconds

export default function QRLogin({ onClose, onConnected }: QRLoginProps) {
  const [state, setState] = useState<QRState>('loading')
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const connectedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestAccountIdRef = useRef<string | null>(null)

  // Listen for QR codes
  useIPCEvent('account:qr', (data) => {
    latestAccountIdRef.current = data.accountId

    // Clear any existing expiry timer
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current)
    }

    QRCode.toDataURL(data.qr, {
      width: 280,
      margin: 2,
      color: {
        dark: '#f0f6fc',
        light: '#0d1117',
      },
    })
      .then((url) => {
        setQrDataUrl(url)
        setState('qr')

        // Start QR expiry timer
        expiryTimerRef.current = setTimeout(() => {
          setState('expired')
        }, QR_EXPIRY_MS)
      })
      .catch(console.error)
  })

  // Listen for connection success
  useIPCEvent('account:connection', (data) => {
    if (data.state === 'open') {
      if (expiryTimerRef.current) {
        clearTimeout(expiryTimerRef.current)
      }
      setState('connected')
      connectedTimerRef.current = setTimeout(() => {
        onConnected()
      }, 1000)
    }
  })

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (connectedTimerRef.current) {
        clearTimeout(connectedTimerRef.current)
      }
      if (expiryTimerRef.current) {
        clearTimeout(expiryTimerRef.current)
      }
    }
  }, [])

  const handleRefresh = () => {
    setState('loading')
    setQrDataUrl(null)
    if (latestAccountIdRef.current) {
      window.api.invoke('account:reconnect', { id: latestAccountIdRef.current }).catch(console.error)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-bg-secondary rounded-2xl p-8 max-w-md w-full mx-4 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="1" x2="13" y2="13" />
            <line x1="13" y1="1" x2="1" y2="13" />
          </svg>
        </button>

        {/* Title */}
        <h2 className="text-xl font-bold text-text-primary mb-2">Link WhatsApp</h2>
        <p className="text-sm text-text-secondary mb-6">
          Open WhatsApp on your phone, go to Settings &gt; Linked Devices &gt; Link a Device, then scan the QR code below.
        </p>

        {/* QR area */}
        <div className="flex justify-center mb-4">
          {state === 'loading' && (
            <div className="w-[280px] h-[280px] flex items-center justify-center">
              <div className="w-8 h-8 border-3 border-accent-purple border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {state === 'qr' && qrDataUrl && (
            <img
              src={qrDataUrl}
              alt="WhatsApp QR Code"
              width={280}
              height={280}
              className="rounded-lg"
            />
          )}

          {state === 'expired' && (
            <div className="w-[280px] h-[280px] flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-accent-red/20 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#f85149" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="16" cy="16" r="12" />
                  <line x1="16" y1="10" x2="16" y2="18" />
                  <circle cx="16" cy="22" r="1" fill="#f85149" stroke="none" />
                </svg>
              </div>
              <span className="text-accent-red text-sm font-medium">QR code expired</span>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-accent-purple text-white text-sm rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
              >
                Refresh QR Code
              </button>
            </div>
          )}

          {state === 'connected' && (
            <div className="w-[280px] h-[280px] flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-accent-green/20 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#3fb950" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="8,16 14,22 24,10" />
                </svg>
              </div>
              <span className="text-accent-green text-sm font-medium">Connected successfully!</span>
            </div>
          )}
        </div>

        {/* Help text */}
        {state === 'qr' && (
          <p className="text-xs text-text-muted text-center">
            The QR code refreshes automatically. Keep this window open until the connection is established.
          </p>
        )}
      </div>
    </div>
  )
}
