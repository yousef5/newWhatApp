import { create } from 'zustand'
import type { Chat } from '@shared/types'

type ChatFilter = 'all' | 'unread' | 'groups'

interface ChatsState {
  chats: Chat[]
  activeChatJid: string | null
  filter: ChatFilter
  searchQuery: string

  setChats: (chats: Chat[]) => void
  setActiveChat: (jid: string | null) => void
  setFilter: (filter: ChatFilter) => void
  setSearchQuery: (query: string) => void
  updateChat: (jid: string, update: Partial<Chat>) => void
  getFilteredChats: () => Chat[]
}

export const useChatsStore = create<ChatsState>((set, get) => ({
  chats: [],
  activeChatJid: null,
  filter: 'all',
  searchQuery: '',

  setChats: (chats) => set({ chats }),

  setActiveChat: (jid) => set({ activeChatJid: jid }),

  setFilter: (filter) => set({ filter }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  updateChat: (jid, update) =>
    set((s) => ({
      chats: s.chats.map((c) =>
        c.jid === jid ? { ...c, ...update } : c
      ),
    })),

  getFilteredChats: () => {
    const { chats, filter, searchQuery } = get()
    let filtered = chats.filter((c) => !c.archived)

    if (filter === 'unread') {
      filtered = filtered.filter((c) => c.unreadCount > 0)
    } else if (filter === 'groups') {
      filtered = filtered.filter((c) => c.isGroup)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter((c) => c.name.toLowerCase().includes(q))
    }

    // Sort: pinned first, then by lastMessageTimestamp descending
    return filtered.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return (b.lastMessageTimestamp ?? 0) - (a.lastMessageTimestamp ?? 0)
    })
  },
}))
