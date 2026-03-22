import { create } from 'zustand'
import type { Message } from '@shared/types'

interface MessagesState {
  messages: Message[]
  loading: boolean
  hasMore: boolean

  setMessages: (messages: Message[]) => void
  prependMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  updateMessage: (id: string, update: Partial<Message>) => void
  removeMessage: (id: string) => void
  setLoading: (loading: boolean) => void
  setHasMore: (hasMore: boolean) => void
  clear: () => void
}

export const useMessagesStore = create<MessagesState>((set) => ({
  messages: [],
  loading: false,
  hasMore: true,

  setMessages: (messages) => set({ messages }),

  prependMessages: (messages) =>
    set((s) => ({ messages: [...messages, ...s.messages] })),

  addMessage: (message) =>
    set((s) => ({ messages: [...s.messages, message] })),

  updateMessage: (id, update) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, ...update } : m
      ),
    })),

  removeMessage: (id) =>
    set((s) => ({
      messages: s.messages.filter((m) => m.id !== id),
    })),

  setLoading: (loading) => set({ loading }),

  setHasMore: (hasMore) => set({ hasMore }),

  clear: () => set({ messages: [], loading: false, hasMore: true }),
}))
