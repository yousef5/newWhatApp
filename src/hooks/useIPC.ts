import { useCallback, useEffect, useRef } from 'react'
import type { IPCChannel, IPCCommands, IPCEventChannel, IPCEvents } from '@shared/types'

/**
 * Returns a typed invoke function that wraps window.api.invoke.
 */
export function useIPCInvoke() {
  return useCallback(
    <C extends IPCChannel>(
      channel: C,
      payload: IPCCommands[C]['payload']
    ): Promise<IPCCommands[C]['response']> => {
      return window.api.invoke(channel, payload)
    },
    []
  )
}

/**
 * Subscribes to an IPC event channel. Cleans up on unmount.
 * Uses a ref for stable handler reference so the subscription
 * doesn't churn when the handler closure changes.
 */
export function useIPCEvent<C extends IPCEventChannel>(
  channel: C,
  handler: (data: IPCEvents[C]) => void
): void {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const unsubscribe = window.api.on(channel, (data) => {
      handlerRef.current(data)
    })
    return unsubscribe
  }, [channel])
}
