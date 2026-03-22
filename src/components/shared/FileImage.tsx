import { useFileUrl } from '@/hooks/useFileUrl'

interface FileImageProps {
  filePath?: string | null
  alt?: string
  className?: string
  fallback?: string
}

export default function FileImage({ filePath, alt = '', className = '', fallback = 'LOADING...' }: FileImageProps) {
  const dataUrl = useFileUrl(filePath)

  if (!filePath) {
    return (
      <div className={`flex items-center justify-center bg-bg-tertiary text-text-muted text-xs font-mono uppercase ${className}`}>
        {fallback}
      </div>
    )
  }

  if (!dataUrl) {
    return (
      <div className={`flex items-center justify-center bg-bg-tertiary text-text-muted text-xs font-mono uppercase animate-pulse ${className}`}>
        LOADING...
      </div>
    )
  }

  return <img src={dataUrl} alt={alt} className={className} />
}
