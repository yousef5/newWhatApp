import { useState, useEffect } from 'react'

const cache = new Map<string, string>()

export function useFileUrl(filePath: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(filePath ? cache.get(filePath) ?? null : null)

  useEffect(() => {
    if (!filePath) {
      setUrl(null)
      return
    }

    // Check cache first
    const cached = cache.get(filePath)
    if (cached) {
      setUrl(cached)
      return
    }

    let cancelled = false
    window.api.getFileUrl(filePath).then((dataUrl) => {
      if (cancelled) return
      if (dataUrl) {
        cache.set(filePath, dataUrl)
        setUrl(dataUrl)
      }
    })

    return () => { cancelled = true }
  }, [filePath])

  return url
}
