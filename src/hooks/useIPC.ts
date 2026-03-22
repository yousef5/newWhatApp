import { useCallback } from 'react'
import type { IPCChannel, IPCCommands } from '@shared/types'

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
