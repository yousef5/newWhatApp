import { useEffect, useCallback } from 'react'
import { useAccountsStore } from '@/stores/accounts'
import { useChatsStore } from '@/stores/chats'
import { useMessagesStore } from '@/stores/messages'
import { useIPCEvent } from './useIPC'

export function useAccounts() {
  const accounts = useAccountsStore((s) => s.accounts)
  const activeAccountId = useAccountsStore((s) => s.activeAccountId)
  const setAccounts = useAccountsStore((s) => s.setAccounts)
  const setActiveAccount = useAccountsStore((s) => s.setActiveAccount)
  const updateConnectionState = useAccountsStore((s) => s.updateConnectionState)
  const incrementUnread = useAccountsStore((s) => s.incrementUnread)

  const setChats = useChatsStore((s) => s.setChats)
  const updateChat = useChatsStore((s) => s.updateChat)
  const activeChatJid = useChatsStore((s) => s.activeChatJid)

  const addMessage = useMessagesStore((s) => s.addMessage)
  const updateMessage = useMessagesStore((s) => s.updateMessage)
  const removeMessage = useMessagesStore((s) => s.removeMessage)
  const clearMessages = useMessagesStore((s) => s.clear)

  // Load accounts on mount + poll for chats until they appear
  useEffect(() => {
    let pollTimer: ReturnType<typeof setInterval> | null = null

    const load = async () => {
      try {
        const accountList = await window.api.invoke('account:list', undefined)
        setAccounts(accountList)
        if (!useAccountsStore.getState().activeAccountId && accountList.length > 0) {
          const firstId = accountList[0].id
          setActiveAccount(firstId)

          // Poll for chats until they appear (connection might not be ready yet)
          const tryLoadChats = async () => {
            try {
              const chats = await window.api.invoke('chat:list', { accountId: firstId })
              useChatsStore.getState().setChats(chats)
              if (chats.length > 0 && pollTimer) {
                clearInterval(pollTimer)
                pollTimer = null
              }
            } catch {}
          }

          tryLoadChats()
          pollTimer = setInterval(tryLoadChats, 2000)

          // Stop polling after 30 seconds regardless
          setTimeout(() => {
            if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
          }, 30000)
        }
      } catch (err) {
        console.error('Failed to load accounts:', err)
      }
    }
    load()

    return () => { if (pollTimer) clearInterval(pollTimer) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Switch account: set active, clear messages, load chats
  const switchAccount = useCallback(
    async (id: string) => {
      setActiveAccount(id)
      clearMessages()
      setChats([])
      try {
        const chats = await window.api.invoke('chat:list', { accountId: id })
        setChats(chats)
      } catch (err) {
        console.error('Failed to load chats:', err)
      }
    },
    [setActiveAccount, clearMessages, setChats]
  )

  // IPC event: connection state change
  useIPCEvent('account:connection', (data) => {
    updateConnectionState(data.accountId, data.state)
    // If connection just opened for active account, reload chats after sync delay
    if (data.state === 'open' && data.accountId === useAccountsStore.getState().activeAccountId) {
      // Load immediately (may be empty)
      window.api
        .invoke('chat:list', { accountId: data.accountId })
        .then(setChats)
        .catch(console.error)

      // Reload after delays to catch history sync data
      setTimeout(() => {
        if (useAccountsStore.getState().activeAccountId === data.accountId) {
          window.api.invoke('chat:list', { accountId: data.accountId }).then(setChats).catch(console.error)
        }
      }, 3000)
      setTimeout(() => {
        if (useAccountsStore.getState().activeAccountId === data.accountId) {
          window.api.invoke('chat:list', { accountId: data.accountId }).then(setChats).catch(console.error)
        }
      }, 8000)
    }
  })

  // IPC event: account idle
  useIPCEvent('account:idle', (data) => {
    updateConnectionState(data.accountId, 'close')
  })

  // IPC event: new message
  useIPCEvent('message:new', (data) => {
    const state = useAccountsStore.getState()
    const chatState = useChatsStore.getState()

    if (data.accountId === state.activeAccountId) {
      // Update chat list preview
      updateChat(data.message.chatJid, {
        lastMessageTimestamp: data.message.timestamp,
        lastMessagePreview: data.message.content,
      })

      // If viewing the chat this message belongs to, add it and mark read
      if (chatState.activeChatJid === data.message.chatJid) {
        addMessage(data.message)
        // Auto-mark read
        window.api
          .invoke('chat:markRead', {
            accountId: data.accountId,
            jid: data.message.chatJid,
          })
          .catch(console.error)
      } else {
        // Not viewing this chat — increment unread on the chat
        updateChat(data.message.chatJid, {
          unreadCount: (chatState.chats.find((c) => c.jid === data.message.chatJid)?.unreadCount ?? 0) + 1,
        })
      }
    }

    // Increment account-level unread for non-self messages if not the active chat
    if (
      !data.message.isFromMe &&
      !(
        data.accountId === state.activeAccountId &&
        chatState.activeChatJid === data.message.chatJid
      )
    ) {
      incrementUnread(data.accountId)
    }
  })

  // IPC event: message update
  useIPCEvent('message:update', (data) => {
    const state = useAccountsStore.getState()
    if (data.accountId === state.activeAccountId) {
      updateMessage(data.messageId, data.update)
    }
  })

  // IPC event: message delete
  useIPCEvent('message:delete', (data) => {
    const state = useAccountsStore.getState()
    if (data.accountId === state.activeAccountId) {
      removeMessage(data.messageId)
    }
  })

  // IPC event: chat update
  useIPCEvent('chat:update', (data) => {
    const state = useAccountsStore.getState()
    if (data.accountId === state.activeAccountId) {
      const chatState = useChatsStore.getState()
      const existing = chatState.chats.find(c => c.jid === data.jid)
      if (existing) {
        updateChat(data.jid, data.update)
      } else {
        // New chat from history sync — add it to the list
        setChats([...chatState.chats, data.update as import('@shared/types').Chat])
      }
    }
  })

  // IPC event: contact update (refresh chats to pick up name changes)
  useIPCEvent('contact:update', (data) => {
    const state = useAccountsStore.getState()
    if (data.accountId === state.activeAccountId && data.update.name) {
      updateChat(data.jid, { name: data.update.name } as Partial<import('@shared/types').Chat>)
    }
  })

  return { accounts, activeAccountId, switchAccount }
}
