import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { clearChatMessages, loadChatMessages, saveChatMessages } from './chatStorage'
import { ChatManagerContext, getLastUserMessage } from './chatManagerContext'
import type { ChatEngineStatus, ChatMessage } from './types'
import { useModelManager } from '../models/modelManagerContext'
import type { DownloadStatus } from '../models/types'
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

function parseByteProgress(text: string) {
  const lower = text.toLowerCase()
  const pairMatch = lower.match(/(\d+(?:\.\d+)?)\s*(gb|mb|kb|b)\s*\/\s*(\d+(?:\.\d+)?)\s*(gb|mb|kb|b)/)
  if (!pairMatch) return { downloadedBytes: null, totalBytes: null }

  const unitMultiplier: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  }
  const downloaded = Number(pairMatch[1]) * unitMultiplier[pairMatch[2]]
  const total = Number(pairMatch[3]) * unitMultiplier[pairMatch[4]]
  return {
    downloadedBytes: Number.isFinite(downloaded) ? downloaded : null,
    totalBytes: Number.isFinite(total) ? total : null,
  }
}

function inferSetupStage(
  text: string,
): { status: Extract<DownloadStatus, 'downloading' | 'verifying' | 'initializing'>; stageLabel: string } {
  const lower = text.toLowerCase()
  if (lower.includes('download') && lower.includes('weight')) {
    return { status: 'downloading', stageLabel: 'downloading model weights' }
  }
  if (lower.includes('download')) {
    return { status: 'downloading', stageLabel: 'downloading runtime assets' }
  }
  if (lower.includes('cache')) {
    return { status: 'verifying', stageLabel: 'caching files' }
  }
  if (lower.includes('verify') || lower.includes('verif')) {
    return { status: 'verifying', stageLabel: 'verifying files' }
  }
  if (lower.includes('init')) {
    return { status: 'initializing', stageLabel: 'initializing model' }
  }
  return { status: 'initializing', stageLabel: 'preparing download' }
}

function explainError(caught: unknown) {
  if (!(caught instanceof Error)) return 'Failed to initialize WebLLM.'
  const message = caught.message
  const lower = message.toLowerCase()
  if (lower.includes('quota') || lower.includes('storage')) {
    return `Browser storage quota exceeded. Free space and retry. (${message})`
  }
  if (lower.includes('webgpu') || lower.includes('adapter') || lower.includes('device')) {
    return `WebGPU initialization failed. Use a WebGPU-capable browser/device and retry. (${message})`
  }
  if (lower.includes('fetch') || lower.includes('network') || lower.includes('failed to fetch')) {
    return `Network fetch failed while downloading model artifacts. Check connection and retry. (${message})`
  }
  if (lower.includes('invalid') && lower.includes('url')) {
    return `Invalid model URL or configuration detected. (${message})`
  }
  if (lower.includes('cache') || lower.includes('indexeddb') || lower.includes('corrupt')) {
    return `Model cache appears corrupted. Clear cached model artifacts and retry. (${message})`
  }
  return message
}

export function ChatManagerProvider({ children }: { children: ReactNode }) {
  const { updateLifecycle } = useModelManager()
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

    setStatus('checking-cache')
    setProgressText('Preparing local WebGPU inference…')
    setError(null)
    updateLifecycle({
      downloadStatus: 'checking-cache',
      stageLabel: 'checking local cache',
      statusText: 'Checking whether model is already available offline…',
      progress: null,
      downloadedBytes: null,
      totalBytes: null,
      etaSeconds: null,
      indeterminate: true,
      error: null,
      needsRecovery: false,
    })
    console.info('webllm selected model config', { modelId: WEBLLM_MODEL_ID })

    try {
      const hasCachedModel = await hasOfflineModelCache()
      console.info('webllm cache check', { modelId: WEBLLM_MODEL_ID, cached: hasCachedModel })

      if (hasCachedModel) {
        setStatus('initializing')
        updateLifecycle({
          downloadStatus: 'initializing',
          cached: true,
          stageLabel: 'initializing model',
          statusText: 'Cached model found. Initializing for offline chat…',
          progress: 100,
          indeterminate: false,
        })
      } else {
        setStatus('not-downloaded')
        updateLifecycle({
          downloadStatus: 'not-downloaded',
          cached: false,
          stageLabel: 'not downloaded',
          statusText: 'No local model cache found. Download will start now.',
          progress: null,
          indeterminate: true,
        })
      }

      if (!navigator.onLine) {
        if (!hasCachedModel) {
          throw new Error('Model not cached. Connect to the internet to download it first.')
        }
      }

      console.info('webllm init start', { modelId: WEBLLM_MODEL_ID })
      const engine = await getWebLLMEngine((report) => {
        const stage = inferSetupStage(report.text)
        const { downloadedBytes, totalBytes } = parseByteProgress(report.text)
        const progress =
          Number.isFinite(report.progress) && report.progress >= 0
            ? Math.max(0, Math.min(100, Math.round(report.progress * 100)))
            : null
        const indeterminate = progress === null || progress <= 0
        const etaSeconds =
          !indeterminate && report.timeElapsed > 0 && progress && progress > 0 && progress < 100
            ? Math.max(0, Math.round((report.timeElapsed * (100 - progress)) / progress))
            : null
        setStatus(stage.status)
        setProgressText(report.text)
        updateLifecycle({
          downloadStatus: stage.status,
          stageLabel: stage.stageLabel,
          statusText: report.text,
          progress,
          downloadedBytes,
          totalBytes,
          etaSeconds,
          indeterminate,
          cached: false,
        })
        console.info('webllm progress', { stage: stage.stageLabel, progress, text: report.text })
      })

      engineRef.current = engine
      setStatus('ready')
      setProgressText(null)
      setError(null)
      updateLifecycle({
        downloadStatus: 'ready',
        cached: true,
        stageLabel: 'ready for offline chat',
        statusText: 'Ready offline',
        progress: 100,
        downloadedBytes: null,
        totalBytes: null,
        etaSeconds: null,
        indeterminate: false,
        error: null,
        needsRecovery: false,
      })
      console.info('webllm init complete', { modelId: WEBLLM_MODEL_ID })
      return engine
    } catch (caught) {
      const message = explainError(caught)
      setStatus('error')
      setError(message)
      console.error('webllm init failed', caught)
      updateLifecycle({
        downloadStatus: 'error',
        error: message,
        statusText: message,
        stageLabel: 'setup failed',
        indeterminate: true,
        needsRecovery: isModelCacheError(caught),
      })

      if (isModelCacheError(caught)) {
        await recoverModelCache().catch(() => undefined)
        setProgressText('Model cache recovery completed. Retry initialization to redownload artifacts.')
        updateLifecycle({
          downloadStatus: 'not-downloaded',
          cached: false,
          stageLabel: 'cache recovery complete',
          statusText: 'Cache recovery complete. Retry to download a clean model cache.',
          progress: null,
          downloadedBytes: null,
          totalBytes: null,
          etaSeconds: null,
          indeterminate: true,
          needsRecovery: true,
        })
      }

      throw caught
    }
  }, [updateLifecycle])

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
      setError(null)
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
