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
  const avatarFoundRef = useRef(false)

  const extractProfileInfo = useCallback(() => {
    const webview = webviewRef.current
    if (!webview || avatarFoundRef.current) return

    // Step 1: Find the profile picture by looking for the user's own avatar
    // WhatsApp Web has the user avatar as the first clickable image in the left sidebar header
    webview.executeJavaScript(`
      (function() {
        try {
          // Method 1: Get all images and find the small avatar in the header area
          const allImgs = Array.from(document.querySelectorAll('img'))

          // The user's profile pic is typically a small image (33-50px) in the top-left header
          // It's the first img inside a clickable element in the sidebar header
          let avatarUrl = null

          // Try: header area images that look like profile pics
          for (const img of allImgs) {
            const rect = img.getBoundingClientRect()
            // Profile avatar is small (30-60px), in the top-left area (y < 80, x < 100)
            if (rect.width >= 30 && rect.width <= 60 && rect.height >= 30 && rect.height <= 60
                && rect.top < 80 && rect.left < 400
                && img.src && !img.src.includes('emoji') && !img.src.startsWith('data:image/gif')) {
              avatarUrl = img.src
              break
            }
          }

          // If found a blob URL, convert to data URL
          if (avatarUrl && avatarUrl.startsWith('blob:')) {
            return fetch(avatarUrl)
              .then(r => r.blob())
              .then(blob => new Promise((resolve) => {
                const reader = new FileReader()
                reader.onload = () => resolve({ avatar: reader.result })
                reader.readAsDataURL(blob)
              }))
          }

          // If found a regular URL
          if (avatarUrl && avatarUrl.startsWith('http')) {
            // Fetch and convert to data URL to avoid CORS issues
            return fetch(avatarUrl)
              .then(r => r.blob())
              .then(blob => new Promise((resolve) => {
                const reader = new FileReader()
                reader.onload = () => resolve({ avatar: reader.result })
                reader.readAsDataURL(blob)
              }))
              .catch(() => ({ avatar: null }))
          }

          return Promise.resolve({ avatar: avatarUrl })
        } catch(e) {
          return Promise.resolve({ avatar: null })
        }
      })()
    `).then((result: any) => {
      if (result?.avatar && onAvatarUpdate) {
        avatarFoundRef.current = true
        onAvatarUpdate(accountId, result.avatar)
      }
    }).catch(() => {})
  }, [accountId, onAvatarUpdate])

  useEffect(() => {
    const webview = webviewRef.current
    if (!webview) return

    const handleDomReady = () => {
      webview.insertCSS(`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; }
      `)
      // Try extracting at various delays (WhatsApp Web loads progressively)
      setTimeout(extractProfileInfo, 5000)
      setTimeout(extractProfileInfo, 10000)
      setTimeout(extractProfileInfo, 15000)
      setTimeout(extractProfileInfo, 25000)
    }

    webview.addEventListener('dom-ready', handleDomReady)
    return () => webview.removeEventListener('dom-ready', handleDomReady)
  }, [extractProfileInfo])

  // Reset when account changes
  useEffect(() => {
    avatarFoundRef.current = false
  }, [accountId])

  // Retry periodically if not found
  useEffect(() => {
    if (!avatarFoundRef.current) {
      extractIntervalRef.current = setInterval(extractProfileInfo, 30000)
    }
    return () => {
      if (extractIntervalRef.current) {
        clearInterval(extractIntervalRef.current)
      }
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
