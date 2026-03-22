import { create } from 'zustand'
import type { Account } from '@shared/types'

interface AccountsState {
  accounts: Account[]
  activeAccountId: string | null

  setAccounts: (accounts: Account[]) => void
  setActiveAccount: (id: string | null) => void
}

export const useAccountsStore = create<AccountsState>((set) => ({
  accounts: [],
  activeAccountId: null,

  setAccounts: (accounts) => set({ accounts }),

  setActiveAccount: (id) => set({ activeAccountId: id }),
}))
