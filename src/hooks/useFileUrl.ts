import { useState, useEffect } from 'react'

const cache = new Map<string, string>()
const pending = new Map<string, Promise<string | null>>()

export function useFileUrl(filePath: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(() => {
    if (!filePath) return null
    return cache.get(filePath) ?? null
  })

  useEffect(() => {
    if (!filePath) {
      setUrl(null)
      return
    }

    const cached = cache.get(filePath)
    if (cached) {
      setUrl(cached)
      return
    }

    // Deduplicate concurrent requests for the same file
    let promise = pending.get(filePath)
    if (!promise) {
      promise = window.api.getFileUrl(filePath).then((dataUrl) => {
        pending.delete(filePath)
        if (dataUrl) {
          cache.set(filePath, dataUrl)
        }
        return dataUrl
      }).catch(() => {
        pending.delete(filePath)
        return null
      })
      pending.set(filePath, promise)
    }

    let cancelled = false
    promise.then((dataUrl) => {
      if (!cancelled && dataUrl) {
        setUrl(dataUrl)
      }
    })

    return () => { cancelled = true }
  }, [filePath])

  return url
}

// Preload multiple file URLs at once
export function preloadFileUrls(paths: (string | null | undefined)[]): void {
  for (const path of paths) {
    if (path && !cache.has(path) && !pending.has(path)) {
      const promise = window.api.getFileUrl(path).then((dataUrl) => {
        pending.delete(path)
        if (dataUrl) cache.set(path, dataUrl)
        return dataUrl
      }).catch(() => {
        pending.delete(path)
        return null
      })
      pending.set(path, promise)
    }
  }
}
