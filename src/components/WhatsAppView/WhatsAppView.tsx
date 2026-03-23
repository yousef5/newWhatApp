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

  const extractAvatar = useCallback(() => {
    const webview = webviewRef.current
    if (!webview || avatarFoundRef.current) return

    // Inject a script that watches for the avatar image and extracts it
    webview.executeJavaScript(`
      (function() {
        try {
          // Method 1: Look for all images and find the profile avatar
          const imgs = Array.from(document.querySelectorAll('img'))
          let bestImg = null
          let bestScore = -1

          for (const img of imgs) {
            if (!img.src) continue
            if (img.src.startsWith('data:image/gif')) continue
            if (img.src.includes('emoji') || img.src.includes('status')) continue

            const rect = img.getBoundingClientRect()
            if (rect.width < 15 || rect.height < 15) continue
            if (rect.width > 100) continue  // too big, probably not an avatar

            let score = 0
            // Top area of sidebar
            if (rect.top < 70) score += 200
            else if (rect.top < 120) score += 50
            // Left side
            if (rect.left < 80) score += 100
            else if (rect.left < 200) score += 30
            // Right size range for avatar
            if (rect.width >= 30 && rect.width <= 50) score += 80
            else if (rect.width >= 20 && rect.width <= 60) score += 40
            // Has alt text (profile images usually do)
            if (img.alt && img.alt.length > 0) score += 50
            // Circular (border-radius)
            const style = window.getComputedStyle(img)
            if (style.borderRadius === '50%' || parseInt(style.borderRadius) > 15) score += 60

            if (score > bestScore) {
              bestScore = score
              bestImg = img
            }
          }

          if (!bestImg || bestScore < 150) return Promise.resolve(null)

          const alt = bestImg.alt || null
          const src = bestImg.src

          // Fetch and convert to data URL (handles blob: and https: URLs)
          return fetch(src)
            .then(r => r.blob())
            .then(blob => new Promise(resolve => {
              const reader = new FileReader()
              reader.onload = () => resolve({ avatar: reader.result, name: alt })
              reader.onerror = () => resolve(null)
              reader.readAsDataURL(blob)
            }))
            .catch(() => null)
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

  const extractUnreadCount = useCallback(() => {
    const webview = webviewRef.current
    if (!webview || !onUnreadUpdate) return

    webview.executeJavaScript(`
      (function() {
        try {
          // Best: page title "(X) WhatsApp"
          const m = document.title.match(/\\((\\d+)\\)/)
          if (m) return parseInt(m[1], 10)
          // Fallback: aria-label unread badges
          let t = 0
          document.querySelectorAll('[aria-label*="unread"]').forEach(b => {
            const x = b.getAttribute('aria-label')?.match(/(\\d+)\\s*unread/)
            if (x) t += parseInt(x[1], 10)
          })
          return t
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
      // Notification permission
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

      // Extract avatar aggressively — every 2s for first 20s
      for (let i = 1; i <= 10; i++) setTimeout(extractAvatar, i * 2000)
      setTimeout(extractUnreadCount, 3000)
    }

    const handleTitleUpdate = () => extractUnreadCount()

    webview.addEventListener('dom-ready', handleDomReady)
    webview.addEventListener('page-title-updated', handleTitleUpdate)
    return () => {
      webview.removeEventListener('dom-ready', handleDomReady)
      webview.removeEventListener('page-title-updated', handleTitleUpdate)
    }
  }, [extractAvatar, extractUnreadCount])

  useEffect(() => { avatarFoundRef.current = false }, [accountId])

  // Poll unread every 3s
  useEffect(() => {
    unreadIntervalRef.current = setInterval(extractUnreadCount, 3000)
    return () => { if (unreadIntervalRef.current) clearInterval(unreadIntervalRef.current) }
  }, [extractUnreadCount])

  // Retry avatar every 10s if not found
  useEffect(() => {
    if (!avatarFoundRef.current) {
      avatarIntervalRef.current = setInterval(extractAvatar, 10000)
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
