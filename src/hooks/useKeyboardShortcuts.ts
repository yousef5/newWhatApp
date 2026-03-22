import { useEffect, useRef } from 'react'

interface KeyboardShortcutCallbacks {
  onNextAccount: () => void
  onPrevAccount: () => void
  onSearch: () => void
  onEscape: () => void
  onSwitchAccount: (index: number) => void
}

export function useKeyboardShortcuts(callbacks: KeyboardShortcutCallbacks): void {
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { onNextAccount, onPrevAccount, onSearch, onEscape, onSwitchAccount } = callbacksRef.current

      // Ctrl+Tab: next account
      if (e.ctrlKey && !e.shiftKey && e.key === 'Tab') {
        e.preventDefault()
        onNextAccount()
        return
      }

      // Ctrl+Shift+Tab: previous account
      if (e.ctrlKey && e.shiftKey && e.key === 'Tab') {
        e.preventDefault()
        onPrevAccount()
        return
      }

      // Ctrl+F: focus search
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault()
        onSearch()
        return
      }

      // Escape: close active chat/overlay
      if (e.key === 'Escape') {
        onEscape()
        return
      }

      // Ctrl+1 through Ctrl+9: switch to account by index
      if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault()
        onSwitchAccount(parseInt(e.key, 10) - 1)
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
