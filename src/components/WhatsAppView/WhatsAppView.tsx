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

  const extractProfileInfo = useCallback(() => {
    const webview = webviewRef.current
    if (!webview) return

    // Extract the user's own profile picture from WhatsApp Web
    webview.executeJavaScript(`
      (function() {
        try {
          // Try to get the profile avatar from the header/sidebar
          const avatarImg = document.querySelector('header img[draggable="false"]')
            || document.querySelector('[data-testid="default-user"] img')
            || document.querySelector('img[alt][draggable="false"]')
            || document.querySelector('._aigv img') // WhatsApp Web avatar class
            || document.querySelector('header span[data-icon] + div img')

          let avatarUrl = null
          if (avatarImg && avatarImg.src && avatarImg.src.startsWith('blob:')) {
            // Convert blob URL to data URL
            return fetch(avatarImg.src)
              .then(r => r.blob())
              .then(blob => new Promise((resolve) => {
                const reader = new FileReader()
                reader.onload = () => resolve({ avatar: reader.result, name: null })
                reader.readAsDataURL(blob)
              }))
          } else if (avatarImg && avatarImg.src && !avatarImg.src.startsWith('data:image/gif')) {
            avatarUrl = avatarImg.src
          }

          // Try to get the user's name
          const nameEl = document.querySelector('[data-testid="chatlist-header-profile-btn"] span')
            || document.querySelector('header span[dir="auto"]')

          return Promise.resolve({
            avatar: avatarUrl,
            name: nameEl ? nameEl.textContent : null,
          })
        } catch(e) {
          return Promise.resolve({ avatar: null, name: null })
        }
      })()
    `).then((result: any) => {
      if (result?.avatar && onAvatarUpdate) {
        onAvatarUpdate(accountId, result.avatar)
      }
      if (result?.name && onNameUpdate) {
        onNameUpdate(accountId, result.name)
      }
    }).catch(() => {})
  }, [accountId, onAvatarUpdate, onNameUpdate])

  useEffect(() => {
    const webview = webviewRef.current
    if (!webview) return

    const handleDomReady = () => {
      webview.insertCSS(`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; }
      `)
      // Try extracting profile after page loads (with delays for WA to render)
      setTimeout(extractProfileInfo, 5000)
      setTimeout(extractProfileInfo, 10000)
      setTimeout(extractProfileInfo, 20000)
    }

    webview.addEventListener('dom-ready', handleDomReady)
    return () => webview.removeEventListener('dom-ready', handleDomReady)
  }, [extractProfileInfo])

  // Periodically try to extract profile info
  useEffect(() => {
    if (isActive) {
      extractIntervalRef.current = setInterval(extractProfileInfo, 60000)
    } else {
      if (extractIntervalRef.current) {
        clearInterval(extractIntervalRef.current)
        extractIntervalRef.current = null
      }
    }
    return () => {
      if (extractIntervalRef.current) {
        clearInterval(extractIntervalRef.current)
      }
    }
  }, [isActive, extractProfileInfo])

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
