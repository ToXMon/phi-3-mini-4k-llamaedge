import type { ChatMessage } from './types'

const STORAGE_KEY = 'phi3:chat:messages:v1'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isValidRole(value: unknown): value is 'user' | 'assistant' {
  return value === 'user' || value === 'assistant'
}

function sanitizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return []

  return value
    .filter((item): item is Record<string, unknown> => isObject(item))
    .map((item) => {
      const role = isValidRole(item.role) ? item.role : 'assistant'
      if (typeof item.id !== 'string') return null
      const id = item.id
      const content = typeof item.content === 'string' ? item.content : ''
      const createdAt = typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString()

      return {
        id,
        role,
        content,
        createdAt,
      }
    })
    .filter((item): item is ChatMessage => item !== null && item.content.trim().length > 0)
}

export function loadChatMessages(): ChatMessage[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return sanitizeMessages(JSON.parse(raw))
  } catch {
    return []
  }
}

export function saveChatMessages(messages: ChatMessage[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeMessages(messages)))
}

export function clearChatMessages() {
  window.localStorage.removeItem(STORAGE_KEY)
}
