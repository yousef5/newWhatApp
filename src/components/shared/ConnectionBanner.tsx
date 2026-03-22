interface ConnectionBannerProps {
  state: 'connecting' | 'close'
  onRetry?: () => void
}

export default function ConnectionBanner({ state, onRetry }: ConnectionBannerProps) {
  if (state === 'connecting') {
    return (
      <div className="w-full px-4 py-1.5 bg-yellow-600 text-white text-xs text-center flex items-center justify-center gap-2 border-t-2 border-yellow-400 font-mono font-bold uppercase">
        <svg
          className="animate-spin h-3 w-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
          <path d="M12 2a10 10 0 0 1 10 10" />
        </svg>
        RECONNECTING...
      </div>
    )
  }

  return (
    <div className="w-full px-4 py-1.5 bg-accent-red text-white text-xs text-center flex items-center justify-center gap-2 border-t-2 border-red-300 font-mono font-bold uppercase">
      DISCONNECTED
      {onRetry && (
        <>
          {' \u2014 '}
          <button
            onClick={onRetry}
            className="underline hover:no-underline cursor-pointer font-bold"
          >
            RETRY
          </button>
        </>
      )}
    </div>
  )
}
