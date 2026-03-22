/**
 * Format a Unix-seconds timestamp for display.
 * Today → "2:34 PM", Yesterday → "Yesterday", else → "Mar 15"
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const now = new Date()

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (dateDay.getTime() === today.getTime()) {
    return formatFullTime(timestamp)
  }
  if (dateDay.getTime() === yesterday.getTime()) {
    return 'Yesterday'
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Always format as time: "2:34 PM"
 */
export function formatFullTime(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Format date for message group headers.
 * Today → "Today", Yesterday → "Yesterday", else → "Monday, March 15"
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const now = new Date()

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (dateDay.getTime() === today.getTime()) {
    return 'Today'
  }
  if (dateDay.getTime() === yesterday.getTime()) {
    return 'Yesterday'
  }
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Truncate string to `len` characters, appending "..." if truncated.
 */
export function truncate(str: string, len: number): string {
  if (str.length <= len) return str
  return str.slice(0, len) + '...'
}

/**
 * Get initials from a name. "Ahmed Hassan" → "AH", max 2 chars.
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || parts[0] === '') return '?'
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Format bytes into a human-readable size string. e.g. "2.4 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const size = bytes / Math.pow(1024, i)
  return `${size % 1 === 0 ? size : size.toFixed(1)} ${units[i]}`
}
