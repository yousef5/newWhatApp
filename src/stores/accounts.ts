import { create } from 'zustand'
import type { AccountWithState, ConnectionState } from '@shared/types'

interface AccountsState {
  accounts: AccountWithState[]
  activeAccountId: string | null

  setAccounts: (accounts: AccountWithState[]) => void
  setActiveAccount: (id: string | null) => void
  updateConnectionState: (accountId: string, state: ConnectionState) => void
  updateUnreadCount: (accountId: string, count: number) => void
  incrementUnread: (accountId: string) => void
}

export const useAccountsStore = create<AccountsState>((set) => ({
  accounts: [],
  activeAccountId: null,

  setAccounts: (accounts) => set({ accounts }),

  setActiveAccount: (id) => set({ activeAccountId: id }),

  updateConnectionState: (accountId, state) =>
    set((s) => ({
      accounts: s.accounts.map((a) =>
        a.id === accountId ? { ...a, connectionState: state } : a
      ),
    })),

  updateUnreadCount: (accountId, count) =>
    set((s) => ({
      accounts: s.accounts.map((a) =>
        a.id === accountId ? { ...a, unreadCount: count } : a
      ),
    })),

  incrementUnread: (accountId) =>
    set((s) => ({
      accounts: s.accounts.map((a) =>
        a.id === accountId ? { ...a, unreadCount: a.unreadCount + 1 } : a
      ),
    })),
}))
