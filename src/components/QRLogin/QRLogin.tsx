import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { useIPCEvent } from '@/hooks/useIPC'

interface QRLoginProps {
  onClose: () => void
  onConnected: () => void
}

type QRState = 'loading' | 'qr' | 'expired' | 'connected'

const QR_EXPIRY_MS = 60_000

export default function QRLogin({ onClose, onConnected }: QRLoginProps) {
  const [state, setState] = useState<QRState>('loading')
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [progress, setProgress] = useState(100)
  const connectedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const latestAccountIdRef = useRef<string | null>(null)

  useIPCEvent('account:qr', (data) => {
    latestAccountIdRef.current = data.accountId

    if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current)
    if (progressTimerRef.current) clearInterval(progressTimerRef.current)

    QRCode.toDataURL(data.qr, {
      width: 256,
      margin: 0,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        setQrDataUrl(url)
        setState('qr')
        setProgress(100)

        // Countdown progress bar
        const startTime = Date.now()
        progressTimerRef.current = setInterval(() => {
          const elapsed = Date.now() - startTime
          const remaining = Math.max(0, 100 - (elapsed / QR_EXPIRY_MS) * 100)
          setProgress(remaining)
          if (remaining <= 0) {
            if (progressTimerRef.current) clearInterval(progressTimerRef.current)
          }
        }, 200)

        expiryTimerRef.current = setTimeout(() => {
          setState('expired')
          if (progressTimerRef.current) clearInterval(progressTimerRef.current)
        }, QR_EXPIRY_MS)
      })
      .catch(console.error)
  })

  useIPCEvent('account:connection', (data) => {
    if (data.state === 'open') {
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current)
      if (progressTimerRef.current) clearInterval(progressTimerRef.current)
      setState('connected')
      connectedTimerRef.current = setTimeout(onConnected, 1500)
    }
  })

  useEffect(() => {
    return () => {
      if (connectedTimerRef.current) clearTimeout(connectedTimerRef.current)
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current)
      if (progressTimerRef.current) clearInterval(progressTimerRef.current)
    }
  }, [])

  const handleRefresh = () => {
    setState('loading')
    setQrDataUrl(null)
    setProgress(100)
    if (latestAccountIdRef.current) {
      window.api.invoke('account:reconnect', { id: latestAccountIdRef.current }).catch(console.error)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" />

      {/* Dialog */}
      <div
        className="relative w-[480px] max-w-[95vw] overflow-hidden border-2 border-accent-purple bg-bg-secondary"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent line */}
        <div className="h-[3px] bg-accent-purple" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-tertiary cursor-pointer z-10 border border-border-primary"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="1" x2="11" y2="11" />
            <line x1="11" y1="1" x2="1" y2="11" />
          </svg>
        </button>

        <div className="px-8 pt-8 pb-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-accent-purple flex items-center justify-center border-2 border-accent-purple">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 01-4.09-1.123l-.29-.174-3.01.79.8-2.93-.19-.3A8 8 0 1112 20z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary uppercase font-mono tracking-wide">LINK WHATSAPP</h2>
              <p className="text-xs text-text-muted font-mono uppercase">ADD A NEW ACCOUNT</p>
            </div>
          </div>

          {/* Steps */}
          <div className="mt-5 mb-6">
            <div className="flex items-start gap-3 mb-3">
              <span className="w-5 h-5 bg-accent-purple text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 font-mono">1</span>
              <p className="text-[13px] text-text-secondary font-mono">Open <span className="text-text-primary font-bold">WHATSAPP</span> on your phone</p>
            </div>
            <div className="flex items-start gap-3 mb-3">
              <span className="w-5 h-5 bg-accent-purple text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 font-mono">2</span>
              <p className="text-[13px] text-text-secondary font-mono">Go to <span className="text-text-primary font-bold">SETTINGS &gt; LINKED DEVICES</span></p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 bg-accent-purple text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 font-mono">3</span>
              <p className="text-[13px] text-text-secondary font-mono">Tap <span className="text-text-primary font-bold">LINK A DEVICE</span> and scan the code</p>
            </div>
          </div>

          {/* QR Area */}
          <div className="flex justify-center">
            <div
              className="relative w-[272px] h-[272px] flex items-center justify-center border-2 border-border-secondary"
              style={{
                backgroundColor: state === 'qr' ? '#a855f7' : '#0a0a0a',
                padding: state === 'qr' ? '8px' : '0',
              }}
            >
              {state === 'loading' && (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 border-[3px] border-border-secondary" />
                    <div className="absolute inset-0 border-[3px] border-accent-purple border-t-transparent animate-spin" />
                  </div>
                  <span className="text-text-muted text-xs font-mono uppercase">GENERATING QR CODE...</span>
                </div>
              )}

              {state === 'qr' && qrDataUrl && (
                <div className="w-full h-full bg-white flex items-center justify-center p-3">
                  <img
                    src={qrDataUrl}
                    alt="WhatsApp QR Code"
                    className="w-full h-full"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
              )}

              {state === 'expired' && (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-14 h-14 bg-accent-red/20 flex items-center justify-center border-2 border-accent-red">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12,6 12,12 16,14" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-text-primary text-sm font-bold font-mono uppercase">QR CODE EXPIRED</p>
                    <p className="text-text-muted text-xs font-mono mt-1">CLICK BELOW TO GET A NEW ONE</p>
                  </div>
                  <button
                    onClick={handleRefresh}
                    className="px-5 py-2 bg-accent-purple text-white text-sm font-bold font-mono uppercase cursor-pointer flex items-center gap-2 border-2 border-accent-purple hover:bg-accent-purple/80"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23,4 23,10 17,10" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                    REFRESH
                  </button>
                </div>
              )}

              {state === 'connected' && (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-accent-green/15 flex items-center justify-center border-2 border-accent-green">
                    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                      <path d="M11 18l5 5 9-10" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-accent-green text-base font-bold font-mono uppercase">CONNECTED!</p>
                    <p className="text-text-muted text-xs font-mono mt-1 uppercase">LOADING YOUR CONVERSATIONS...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Progress bar (only when QR is showing) */}
          {state === 'qr' && (
            <div className="mt-4 mx-auto w-[272px]">
              <div className="h-1 bg-border-primary overflow-hidden">
                <div
                  className="h-full transition-all duration-200 ease-linear"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: progress > 30
                      ? '#a855f7'
                      : progress > 10
                        ? '#f59e0b'
                        : '#ef4444',
                  }}
                />
              </div>
              <p className="text-[10px] text-text-muted text-center mt-2 font-mono uppercase">
                QR CODE REFRESHES AUTOMATICALLY
              </p>
            </div>
          )}
        </div>

        {/* Bottom accent line */}
        <div className="h-[2px] bg-border-secondary" />

        {/* Footer */}
        <div className="px-8 py-3 flex items-center justify-center gap-1.5">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#555555" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="0" ry="0" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="text-[10px] text-text-muted font-mono uppercase">END-TO-END ENCRYPTED</span>
        </div>
      </div>
    </div>
  )
}
