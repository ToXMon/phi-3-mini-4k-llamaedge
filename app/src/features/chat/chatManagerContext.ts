import { createContext, useContext } from 'react'
import type { ChatMessage, ChatState } from './types'

export interface ChatManagerValue extends ChatState {
  sendMessage: (input: string) => Promise<void>
  stopGeneration: () => void
  regenerateLastAnswer: () => Promise<void>
  clearConversation: () => void
  isBusy: boolean
  canRegenerate: boolean
  canStop: boolean
}

export const ChatManagerContext = createContext<ChatManagerValue | undefined>(undefined)

export { ChatManagerProvider } from './ChatManagerProvider'

export function useChatManager() {
  const context = useContext(ChatManagerContext)
  if (!context) {
    throw new Error('useChatManager must be used within ChatManagerProvider')
  }
  return context
}

export function getLastUserMessage(messages: ChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === 'user') {
      return messages[index]
    }
  }
  return null
}
