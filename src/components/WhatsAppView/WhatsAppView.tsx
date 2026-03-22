import { useRef, useEffect, useCallback } from 'react'

interface WhatsAppViewProps {
  accountId: string
  isActive: boolean
  onAvatarUpdate?: (accountId: string, dataUrl: string) => void
  onNameUpdate?: (accountId: string, name: string) => void
}

export default function WhatsAppView({ accountId, isActive, onAvatarUpdate, onNameUpdate }: WhatsAppViewProps) {
  const webviewRef = useRef<any>(null)
  const extractIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const foundRef = useRef(false)

  const extractProfileInfo = useCallback(() => {
    const webview = webviewRef.current
    if (!webview || foundRef.current) return

    webview.executeJavaScript(`
      (function() {
        try {
          // Find all images and look for the user's avatar in the header
          const imgs = Array.from(document.querySelectorAll('img'))
          for (const img of imgs) {
            const rect = img.getBoundingClientRect()
            // Avatar is a small circular image in the top-left sidebar area
            if (rect.width >= 25 && rect.width <= 60
                && rect.top < 100 && rect.left < 400
                && img.src
                && !img.src.includes('emoji')
                && !img.src.startsWith('data:image/gif')) {
              return {
                src: img.src,
                alt: img.alt || null
              }
            }
          }
          return null
        } catch(e) { return null }
      })()
    `).then((result: any) => {
      if (!result?.src) return

      // Update name from alt text
      if (result.alt && onNameUpdate) {
        onNameUpdate(accountId, result.alt)
      }

      // Fetch the image and convert to data URL
      webview.executeJavaScript(`
        fetch("${result.src}")
          .then(r => r.blob())
          .then(blob => new Promise(resolve => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result)
            reader.readAsDataURL(blob)
          }))
          .catch(() => null)
      `).then((dataUrl: string | null) => {
        if (dataUrl && onAvatarUpdate) {
          foundRef.current = true
          onAvatarUpdate(accountId, dataUrl)
        }
      }).catch(() => {})
    }).catch(() => {})
  }, [accountId, onAvatarUpdate, onNameUpdate])

  useEffect(() => {
    const webview = webviewRef.current
    if (!webview) return

    const handleDomReady = () => {
      // Override Notification.permission to always be 'granted'
      webview.executeJavaScript(`
        (function() {
          if (window.Notification) {
            Object.defineProperty(Notification, 'permission', { get: () => 'granted' });
            Notification.requestPermission = () => Promise.resolve('granted');
          }
        })()
      `).catch(() => {})

      webview.insertCSS(`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; }
      `)
      setTimeout(extractProfileInfo, 5000)
      setTimeout(extractProfileInfo, 12000)
      setTimeout(extractProfileInfo, 25000)
    }

    webview.addEventListener('dom-ready', handleDomReady)
    return () => webview.removeEventListener('dom-ready', handleDomReady)
  }, [extractProfileInfo])

  useEffect(() => {
    avatarFoundReset()
  }, [accountId])

  function avatarFoundReset() {
    foundRef.current = false
  }

  useEffect(() => {
    if (!foundRef.current) {
      extractIntervalRef.current = setInterval(extractProfileInfo, 30000)
    }
    return () => {
      if (extractIntervalRef.current) clearInterval(extractIntervalRef.current)
    }
  }, [extractProfileInfo])

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
