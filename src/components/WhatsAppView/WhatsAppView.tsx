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
  const unreadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const avatarIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const avatarFoundRef = useRef(false)

  // Extract avatar by capturing the profile image area via canvas
  const extractAvatar = useCallback(() => {
    const webview = webviewRef.current
    if (!webview || avatarFoundRef.current) return

    webview.executeJavaScript(`
      (function() {
        try {
          // Strategy 1: Find the user's own avatar in the sidebar header
          // It's typically the first img with a blob: or https: src in the header area
          const candidates = []
          const allImgs = document.querySelectorAll('img')
          for (const img of allImgs) {
            if (!img.src || img.src.startsWith('data:image/gif') || img.src.includes('emoji')) continue
            const rect = img.getBoundingClientRect()
            if (rect.width < 20 || rect.height < 20) continue
            // Score by position — top-left images are more likely the profile avatar
            const score = (rect.top < 80 ? 100 : 0) + (rect.left < 100 ? 50 : 0) + (rect.width >= 30 && rect.width <= 50 ? 30 : 0)
            if (score > 0) {
              candidates.push({ img, score, rect })
            }
          }
          // Sort by score descending, pick the best
          candidates.sort((a, b) => b.score - a.score)

          const best = candidates[0]
          if (!best) return Promise.resolve(null)

          const img = best.img
          const alt = img.alt || null

          // Convert image to data URL using canvas
          const canvas = document.createElement('canvas')
          const size = 128
          canvas.width = size
          canvas.height = size
          const ctx = canvas.getContext('2d')
          if (!ctx) return Promise.resolve(null)

          // If image is already loaded and same-origin, draw directly
          if (img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, 0, 0, size, size)
            try {
              const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
              if (dataUrl && dataUrl.length > 100) {
                return Promise.resolve({ avatar: dataUrl, name: alt })
              }
            } catch(e) {
              // Tainted canvas — need to fetch
            }
          }

          // Fallback: fetch the image URL and convert
          if (img.src.startsWith('blob:') || img.src.startsWith('http')) {
            return fetch(img.src)
              .then(r => r.blob())
              .then(blob => {
                return new Promise(resolve => {
                  const reader = new FileReader()
                  reader.onload = () => resolve({ avatar: reader.result, name: alt })
                  reader.onerror = () => resolve(null)
                  reader.readAsDataURL(blob)
                })
              })
              .catch(() => null)
          }

          return Promise.resolve(null)
        } catch(e) {
          return Promise.resolve(null)
        }
      })()
    `).then((result: any) => {
      if (result?.avatar && onAvatarUpdate) {
        avatarFoundRef.current = true
        onAvatarUpdate(accountId, result.avatar)
      }
      if (result?.name && onNameUpdate) {
        onNameUpdate(accountId, result.name)
      }
    }).catch(() => {})
  }, [accountId, onAvatarUpdate, onNameUpdate])

  // Extract unread count from page title or DOM
  const extractUnreadCount = useCallback(() => {
    const webview = webviewRef.current
    if (!webview || !onUnreadUpdate) return

    webview.executeJavaScript(`
      (function() {
        try {
          // Best method: page title shows "(X) WhatsApp"
          const titleMatch = document.title.match(/\\((\\d+)\\)/)
          if (titleMatch) return parseInt(titleMatch[1], 10)

          // Fallback: count unread badges in chat list
          let total = 0
          const badges = document.querySelectorAll('[aria-label*="unread"]')
          for (const badge of badges) {
            const match = badge.getAttribute('aria-label')?.match(/(\\d+)\\s*unread/)
            if (match) total += parseInt(match[1], 10)
          }
          if (total > 0) return total

          // Another fallback: spans with just numbers inside chat items
          const spans = document.querySelectorAll('span[aria-hidden="true"]')
          for (const span of spans) {
            const text = span.textContent?.trim()
            if (text && /^\\d+$/.test(text) && parseInt(text) < 10000) {
              const parent = span.closest('[role="listitem"]') || span.closest('[data-testid]')
              if (parent) total += parseInt(text, 10)
            }
          }
          return total
        } catch(e) { return 0 }
      })()
    `).then((count: number) => {
      onUnreadUpdate(accountId, count || 0)
    }).catch(() => {})
  }, [accountId, onUnreadUpdate])

  // Setup webview events
  useEffect(() => {
    const webview = webviewRef.current
    if (!webview) return

    const handleDomReady = () => {
      // Grant notification permission
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

      // Try extracting avatar at increasing intervals
      setTimeout(extractAvatar, 5000)
      setTimeout(extractAvatar, 12000)
      setTimeout(extractAvatar, 25000)
      setTimeout(extractUnreadCount, 8000)
    }

    const handleTitleUpdate = () => extractUnreadCount()

    webview.addEventListener('dom-ready', handleDomReady)
    webview.addEventListener('page-title-updated', handleTitleUpdate)
    return () => {
      webview.removeEventListener('dom-ready', handleDomReady)
      webview.removeEventListener('page-title-updated', handleTitleUpdate)
    }
  }, [extractAvatar, extractUnreadCount])

  // Reset avatar found flag on account change
  useEffect(() => { avatarFoundRef.current = false }, [accountId])

  // Poll unread every 5s
  useEffect(() => {
    unreadIntervalRef.current = setInterval(extractUnreadCount, 5000)
    return () => { if (unreadIntervalRef.current) clearInterval(unreadIntervalRef.current) }
  }, [extractUnreadCount])

  // Retry avatar every 30s if not found
  useEffect(() => {
    if (!avatarFoundRef.current) {
      avatarIntervalRef.current = setInterval(extractAvatar, 30000)
    }
    return () => { if (avatarIntervalRef.current) clearInterval(avatarIntervalRef.current) }
  }, [extractAvatar])

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
