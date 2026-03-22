import { useState, useCallback } from 'react'
import { useChatsStore } from '@/stores/chats'
import { useAccountsStore } from '@/stores/accounts'
import { useMessagesStore } from '@/stores/messages'
import ConnectionBanner from '@/components/shared/ConnectionBanner'
import StarredMessages from '@/components/StarredMessages/StarredMessages'
import ChatHeader from './ChatHeader'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import type { Message } from '@shared/types'

interface MessageViewProps {
  accountId: string
  chatJid: string
}

export default function MessageView({ accountId, chatJid }: MessageViewProps) {
  const chat = useChatsStore((s) => s.chats.find((c) => c.jid === chatJid))
  const account = useAccountsStore((s) => s.accounts.find((a) => a.id === accountId))
  const addMessage = useMessagesStore((s) => s.addMessage)
  const [showStarred, setShowStarred] = useState(false)

  const isConnected = account?.connectionState === 'open'

  const handleSend = useCallback(
    async (text: string) => {
      // Optimistic message
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        chatJid,
        senderJid: null,
        timestamp: Math.floor(Date.now() / 1000),
        type: 'text',
        content: text,
        mediaPath: null,
        mediaMime: null,
        mediaSize: null,
        thumbnailPath: null,
        isFromMe: true,
        status: 'pending',
        starred: false,
        quotedMessageId: null,
        quotedMessagePreview: null,
      }

      addMessage(optimisticMessage)

      try {
        const result = await window.api.invoke('message:send', {
          accountId,
          jid: chatJid,
          content: { text },
        })

        // Update the temp message id with the real one
        useMessagesStore.getState().updateMessage(optimisticMessage.id, {
          id: result.id,
          status: 'sent',
        })
      } catch (err) {
        console.error('Failed to send message:', err)
        useMessagesStore.getState().updateMessage(optimisticMessage.id, {
          status: 'failed',
        })
      }
    },
    [accountId, chatJid, addMessage]
  )

  const handleSendVoice = useCallback(
    async (blob: Blob) => {
      try {
        const arrayBuffer = await blob.arrayBuffer()
        await window.api.invoke('media:convertVoice', {
          accountId,
          jid: chatJid,
          audioBuffer: arrayBuffer,
        })
      } catch (err) {
        console.error('Failed to send voice note:', err)
      }
    },
    [accountId, chatJid]
  )

  const handleAttach = useCallback(() => {
    // Placeholder - no-op for now
  }, [])

  const handleExportChat = useCallback(async () => {
    try {
      const result = await window.api.invoke('chat:export', { accountId, jid: chatJid })
      if (result.filePath) {
        console.log('Chat exported to:', result.filePath)
      }
    } catch (err) {
      console.error('Failed to export chat:', err)
    }
  }, [accountId, chatJid])

  const handleRetry = useCallback(() => {
    window.api.invoke('account:reconnect', { id: accountId }).catch(console.error)
  }, [accountId])

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-primary">
        <span className="text-text-muted text-sm">Chat not found</span>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-bg-primary min-w-0">
      {/* Connection banner */}
      {account && !isConnected && (
        <ConnectionBanner
          state={account.connectionState === 'connecting' ? 'connecting' : 'close'}
          onRetry={account.connectionState === 'close' ? handleRetry : undefined}
        />
      )}

      {/* Chat header */}
      <ChatHeader
        accountId={accountId}
        chatJid={chatJid}
        chatName={chat.name}
        isGroup={chat.isGroup}
        onExportChat={handleExportChat}
        onStarredMessages={() => setShowStarred(true)}
      />

      {/* Messages */}
      <MessageList
        accountId={accountId}
        chatJid={chatJid}
        isGroup={chat.isGroup}
      />

      {/* Input */}
      <MessageInput onSend={handleSend} onAttach={handleAttach} onSendVoice={handleSendVoice} />

      {/* Starred messages overlay */}
      {showStarred && (
        <StarredMessages
          accountId={accountId}
          onClose={() => setShowStarred(false)}
        />
      )}
    </div>
  )
}
