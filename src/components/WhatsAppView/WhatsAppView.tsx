import { useRef, useEffect, useCallback } from 'react'

interface WhatsAppViewProps {
  accountId: string
  isActive: boolean
  onThumbnail?: (accountId: string, dataUrl: string) => void
}

export default function WhatsAppView({ accountId, isActive, onThumbnail }: WhatsAppViewProps) {
  const webviewRef = useRef<any>(null)
  const captureIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const captureScreenshot = useCallback(() => {
    const webview = webviewRef.current
    if (!webview || !onThumbnail) return
    try {
      webview.capturePage().then((image: any) => {
        if (image && !image.isEmpty()) {
          const resized = image.resize({ width: 120, quality: 'low' })
          const dataUrl = resized.toDataURL()
          if (dataUrl) onThumbnail(accountId, dataUrl)
        }
      }).catch(() => {})
    } catch {}
  }, [accountId, onThumbnail])

  useEffect(() => {
    const webview = webviewRef.current
    if (!webview) return

    const handleDomReady = () => {
      webview.insertCSS(`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; }
      `)
      // Capture initial screenshot after page loads
      setTimeout(captureScreenshot, 3000)
    }

    webview.addEventListener('dom-ready', handleDomReady)
    return () => webview.removeEventListener('dom-ready', handleDomReady)
  }, [captureScreenshot])

  // Capture screenshot periodically when active
  useEffect(() => {
    if (isActive) {
      // Capture when switching to this account
      setTimeout(captureScreenshot, 500)
      // Then every 30 seconds
      captureIntervalRef.current = setInterval(captureScreenshot, 30000)
    } else {
      // Capture one last screenshot when switching away
      captureScreenshot()
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current)
        captureIntervalRef.current = null
      }
    }
    return () => {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current)
        captureIntervalRef.current = null
      }
    }
  }, [isActive, captureScreenshot])

  return (
    <webview
      ref={webviewRef}
      src="https://web.whatsapp.com"
      partition={`persist:wa-${accountId}`}
      style={{
        display: isActive ? 'flex' : 'none',
        width: '100%',
        height: '100%',
        position: isActive ? 'relative' : 'absolute',
        top: 0,
        left: 0,
      }}
      // @ts-ignore
      allowpopups="true"
      useragent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    />
  )
}
