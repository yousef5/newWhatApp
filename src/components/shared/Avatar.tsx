import { useFileUrl } from '@/hooks/useFileUrl'
import { getInitials } from '@/lib/utils'

const COLORS = [
  '#a855f7', '#3b82f6', '#22c55e', '#e040fb', '#f59e0b',
  '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#10b981',
]

function hashColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COLORS[Math.abs(hash) % COLORS.length]
}

interface AvatarProps {
  filePath?: string | null
  name?: string | null
  jid?: string
  size?: number
  isGroup?: boolean
}

export default function Avatar({ filePath, name, jid, size = 40, isGroup }: AvatarProps) {
  const dataUrl = useFileUrl(filePath)
  const displayName = name || jid?.split('@')[0] || '?'
  const bgColor = isGroup ? '#3b82f6' : hashColor(jid || displayName)

  if (dataUrl) {
    return (
      <img
        src={dataUrl}
        alt=""
        className="shrink-0 object-cover border-2 border-border-secondary"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className="shrink-0 flex items-center justify-center text-white font-bold font-mono border-2 border-border-secondary"
      style={{ width: size, height: size, backgroundColor: bgColor, fontSize: size * 0.3 }}
    >
      {getInitials(displayName)}
    </div>
  )
}
