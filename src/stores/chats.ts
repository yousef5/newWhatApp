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
  upsertChat: (chat: Chat) => void
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

  // Add or update a chat — if it exists update it, otherwise add it
  upsertChat: (chat) =>
    set((s) => {
      const exists = s.chats.find((c) => c.jid === chat.jid)
      if (exists) {
        return { chats: s.chats.map((c) => c.jid === chat.jid ? { ...c, ...chat } : c) }
      }
      return { chats: [chat, ...s.chats] }
    }),
}))
