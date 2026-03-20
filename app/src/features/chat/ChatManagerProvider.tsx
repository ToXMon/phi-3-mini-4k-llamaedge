import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { clearChatMessages, loadChatMessages, saveChatMessages } from './chatStorage'
import { ChatManagerContext, getLastUserMessage } from './chatManagerContext'
import type { ChatEngineStatus, ChatMessage } from './types'
import {
  generateStreamingReply,
  getWebLLMEngine,
  hasOfflineModelCache,
  recoverModelCache,
  stopStreaming,
  WEBLLM_MODEL_ID,
} from './webllmEngine'

function nowIso() {
  return new Date().toISOString()
}

function createMessage(role: 'user' | 'assistant', content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: nowIso(),
  }
}

function createAssistantPlaceholder(): ChatMessage {
  return createMessage('assistant', '')
}

function trimMessage(input: string) {
  return input.trim()
}

function findLastAssistantIndex(messages: ChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === 'assistant') return index
  }
  return -1
}

function getLastMessage(messages: ChatMessage[]) {
  return messages.length > 0 ? messages[messages.length - 1] : null
}

function findLastMessageIndexById(messages: ChatMessage[], messageId: string) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].id === messageId) return index
  }
  return -1
}

const CACHE_ERROR_TOKENS = [
  'indexeddb',
  'idb',
  '(cache\\s*(corrupt|failed)|corrupt(ed)?\\s*cache)',
  'database\\s*corrupt',
]

function isModelCacheError(caught: unknown) {
  if (!(caught instanceof Error)) return false
  const pattern = new RegExp(`(${CACHE_ERROR_TOKENS.join('|')})`, 'i')
  return pattern.test(caught.message)
}

export function ChatManagerProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadChatMessages())
  const [status, setStatus] = useState<ChatEngineStatus>('idle')
  const [progressText, setProgressText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  const engineRef = useRef<Awaited<ReturnType<typeof getWebLLMEngine>> | null>(null)
  const isGeneratingRef = useRef(false)
  const messagesRef = useRef(messages)

  useEffect(() => {
    saveChatMessages(messages)
    messagesRef.current = messages
  }, [messages])

  const initializeEngine = useCallback(async () => {
    if (engineRef.current) return engineRef.current

    setStatus('initializing')
    setProgressText('Preparing local WebGPU inference…')
    setError(null)

    try {
      if (!navigator.onLine) {
        const hasCachedModel = await hasOfflineModelCache()
        if (!hasCachedModel) {
          throw new Error('Model not cached. Connect to the internet to download it first.')
        }
      }

      const engine = await getWebLLMEngine((report) => {
        const lower = report.text.toLowerCase()
        setStatus(lower.includes('download') ? 'downloading' : 'initializing')
        setProgressText(report.text)
      })

      engineRef.current = engine
      setStatus('ready')
      setProgressText(null)
      return engine
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Failed to initialize WebLLM.'
      setStatus('error')
      setError(message)

      if (isModelCacheError(caught)) {
        await recoverModelCache().catch(() => undefined)
        setProgressText('Model cache recovery completed. Retry initialization to redownload artifacts.')
      }

      throw caught
    }
  }, [])

  const sendMessage = useCallback(async (input: string) => {
    const trimmed = trimMessage(input)
    if (!trimmed || isGeneratingRef.current) return

    const userMessage = createMessage('user', trimmed)
    const assistantPlaceholder = createAssistantPlaceholder()
    const baseMessages = [...messagesRef.current, userMessage]

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder])
    setStatus('generating')
    setError(null)
    setProgressText(`Model: ${WEBLLM_MODEL_ID}`)
    setIsBusy(true)
    isGeneratingRef.current = true

    try {
      const engine = await initializeEngine()

      await generateStreamingReply(engine, baseMessages, (chunk) => {
        setMessages((prev) => {
          const next = [...prev]
          const lastAssistantIndex = findLastAssistantIndex(next)
          if (lastAssistantIndex === -1) return prev
          const candidate = next[lastAssistantIndex]
          next[lastAssistantIndex] = {
            ...candidate,
            content: `${candidate.content}${chunk}`,
          }
          return next
        })
      })

      setStatus('ready')
      setProgressText(null)
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Generation failed.'

      setMessages((prev) => {
        const last = getLastMessage(prev)
        if (!last || last.role !== 'assistant') return prev
        if (last.content.trim()) return prev
        return prev.slice(0, -1)
      })

      setStatus('error')
      setError(message)
    } finally {
      isGeneratingRef.current = false
      setIsBusy(false)
    }
  }, [initializeEngine])

  const stopGeneration = useCallback(() => {
    if (!isGeneratingRef.current || !engineRef.current) return
    stopStreaming(engineRef.current)
    setStatus('ready')
    setProgressText('Generation stopped.')
    isGeneratingRef.current = false
    setIsBusy(false)
  }, [])

  const clearConversation = useCallback(() => {
    if (isGeneratingRef.current && engineRef.current) {
      stopStreaming(engineRef.current)
      isGeneratingRef.current = false
    }

    setMessages([])
    clearChatMessages()
    setError(null)
    setProgressText(null)
    setStatus(engineRef.current ? 'ready' : 'idle')
    setIsBusy(false)
  }, [])

  const regenerateLastAnswer = useCallback(async () => {
    if (isGeneratingRef.current) return

    const currentMessages = messagesRef.current
    const lastUserMessage = getLastUserMessage(currentMessages)
    if (!lastUserMessage) return

    const lastUserIndex = findLastMessageIndexById(currentMessages, lastUserMessage.id)
    const nextMessages = currentMessages.slice(0, lastUserIndex)
    setMessages(nextMessages)
    messagesRef.current = nextMessages

    await sendMessage(lastUserMessage.content)
  }, [sendMessage])

  const value = useMemo(() => ({
    messages,
    status,
    progressText,
    error,
    sendMessage,
    stopGeneration,
    regenerateLastAnswer,
    clearConversation,
    isBusy,
    canRegenerate: !isBusy && messages.some((item) => item.role === 'assistant' && item.content.trim().length > 0),
    canStop: status === 'generating' && isBusy,
  }), [
    clearConversation,
    error,
    isBusy,
    messages,
    progressText,
    regenerateLastAnswer,
    sendMessage,
    status,
    stopGeneration,
  ])

  return <ChatManagerContext.Provider value={value}>{children}</ChatManagerContext.Provider>
}
