import { useRef, useEffect } from 'react'

interface WhatsAppViewProps {
  accountId: string
  isActive: boolean
}

export default function WhatsAppView({ accountId, isActive }: WhatsAppViewProps) {
  const webviewRef = useRef<any>(null)

  useEffect(() => {
    const webview = webviewRef.current
    if (!webview) return

    const handleDomReady = () => {
      // Inject custom scrollbar CSS to match our dark theme
      webview.insertCSS(`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; }
      `)
    }

    webview.addEventListener('dom-ready', handleDomReady)
    return () => webview.removeEventListener('dom-ready', handleDomReady)
  }, [])

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
