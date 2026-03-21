export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  createdAt: string
}

export type ChatEngineStatus =
  | 'idle'
  | 'checking-cache'
  | 'not-downloaded'
  | 'verifying'
  | 'initializing'
  | 'downloading'
  | 'ready'
  | 'generating'
  | 'error'

export interface ChatState {
  messages: ChatMessage[]
  status: ChatEngineStatus
  progressText: string | null
  error: string | null
}
