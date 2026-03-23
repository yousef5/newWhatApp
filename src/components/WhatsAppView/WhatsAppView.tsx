import { useRef, useEffect, useCallback } from 'react'

interface WhatsAppViewProps {
  accountId: string
  isActive: boolean
  onAvatarUpdate?: (accountId: string, dataUrl: string) => void
  onNameUpdate?: (accountId: string, name: string) => void
  onUnreadUpdate?: (accountId: string, count: number) => void
}

export default function WhatsAppView({ accountId, isActive, onAvatarUpdate, onNameUpdate, onUnreadUpdate }: WhatsAppViewProps) {
  const webviewRef = useRef<any>(null)
  const extractIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const unreadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const foundRef = useRef(false)

  const extractProfileInfo = useCallback(() => {
    const webview = webviewRef.current
    if (!webview || foundRef.current) return

    webview.executeJavaScript(`
      (function() {
        try {
          const imgs = Array.from(document.querySelectorAll('img'))
          for (const img of imgs) {
            const rect = img.getBoundingClientRect()
            if (rect.width >= 25 && rect.width <= 60
                && rect.top < 100 && rect.left < 400
                && img.src
                && !img.src.includes('emoji')
                && !img.src.startsWith('data:image/gif')) {
              return { src: img.src, alt: img.alt || null }
            }
          }
          return null
        } catch(e) { return null }
      })()
    `).then((result: any) => {
      if (!result?.src) return
      if (result.alt && onNameUpdate) onNameUpdate(accountId, result.alt)

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

  // Extract total unread count from WhatsApp Web DOM
  const extractUnreadCount = useCallback(() => {
    const webview = webviewRef.current
    if (!webview || !onUnreadUpdate) return

    webview.executeJavaScript(`
      (function() {
        try {
          let total = 0
          // WhatsApp Web shows unread badges as spans with aria-label containing unread count
          // or as spans inside chat list items with specific data attributes
          const badges = document.querySelectorAll('[aria-label*="unread"]')
          for (const badge of badges) {
            const match = badge.getAttribute('aria-label')?.match(/(\\d+)\\s*unread/)
            if (match) total += parseInt(match[1], 10)
          }
          // Fallback: look for the green badge circles in chat list
          if (total === 0) {
            const spans = document.querySelectorAll('span[aria-hidden="true"]')
            for (const span of spans) {
              const text = span.textContent?.trim()
              if (text && /^\\d+$/.test(text)) {
                const parent = span.closest('[data-testid="cell-frame-container"]')
                  || span.closest('[role="listitem"]')
                  || span.closest('[data-testid="chat-list-item"]')
                if (parent) {
                  total += parseInt(text, 10)
                }
              }
            }
          }
          // Another fallback: check the page title which shows total unread
          if (total === 0) {
            const titleMatch = document.title.match(/\\((\\d+)\\)/)
            if (titleMatch) total = parseInt(titleMatch[1], 10)
          }
          return total
        } catch(e) { return 0 }
      })()
    `).then((count: number) => {
      onUnreadUpdate(accountId, count || 0)
    }).catch(() => {})
  }, [accountId, onUnreadUpdate])

  useEffect(() => {
    const webview = webviewRef.current
    if (!webview) return

    const handleDomReady = () => {
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

      // Start polling unread count after page loads
      setTimeout(extractUnreadCount, 8000)
    }

    // Also watch for title changes (WhatsApp updates title with unread count)
    const handleTitleUpdate = (_e: any) => {
      extractUnreadCount()
    }
    webview.addEventListener('dom-ready', handleDomReady)
    webview.addEventListener('page-title-updated', handleTitleUpdate)
    return () => {
      webview.removeEventListener('dom-ready', handleDomReady)
      webview.removeEventListener('page-title-updated', handleTitleUpdate)
    }
  }, [extractProfileInfo, extractUnreadCount])

  useEffect(() => {
    foundRef.current = false
  }, [accountId])

  // Poll unread count every 5 seconds
  useEffect(() => {
    unreadIntervalRef.current = setInterval(extractUnreadCount, 5000)
    return () => {
      if (unreadIntervalRef.current) clearInterval(unreadIntervalRef.current)
    }
  }, [extractUnreadCount])

  // Avatar retry
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
