import {
  CreateWebWorkerMLCEngine,
  prebuiltAppConfig,
  type AppConfig,
  type InitProgressReport,
  type MLCEngineConfig,
  type ModelRecord,
  type WebWorkerMLCEngine,
} from '@mlc-ai/web-llm'
import type { ChatMessage, ChatRole } from './types'

export const WEBLLM_MODEL_ID = 'Phi-3-mini-4k-instruct-q4f16_1-MLC'

function getModelRecord(modelId: string): ModelRecord {
  const record = prebuiltAppConfig.model_list.find((item) => item.model_id === modelId)
  if (!record) {
    throw new Error(`WebLLM model "${modelId}" is not available in this build.`)
  }
  return record
}

const APP_CONFIG: AppConfig = {
  model_list: [getModelRecord(WEBLLM_MODEL_ID)],
  useIndexedDBCache: true,
}

const SYSTEM_PROMPT =
  'You are Phi-3 Mini running fully in-browser with no network access. Give concise, helpful answers.'

let enginePromise: Promise<WebWorkerMLCEngine> | null = null

function createWorker() {
  return new Worker(new URL('./webllm.worker.ts', import.meta.url), { type: 'module' })
}

function mapRole(role: ChatRole): 'user' | 'assistant' {
  return role
}

function toWebLLMMessages(messages: ChatMessage[]) {
  return [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    ...messages.map((message) => ({
      role: mapRole(message.role),
      content: message.content,
    })),
  ]
}

export async function getWebLLMEngine(onProgress: (report: InitProgressReport) => void) {
  if (!enginePromise) {
    const worker = createWorker()
    const config: MLCEngineConfig = {
      appConfig: APP_CONFIG,
      initProgressCallback: onProgress,
      logLevel: 'WARN',
    }

    enginePromise = CreateWebWorkerMLCEngine(worker, WEBLLM_MODEL_ID, config).catch((error) => {
      enginePromise = null
      throw error
    })
  }

  return enginePromise
}

export async function generateStreamingReply(
  engine: WebWorkerMLCEngine,
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
) {
  const stream = await engine.chat.completions.create({
    stream: true,
    messages: toWebLLMMessages(messages),
    temperature: 0.2,
    top_p: 0.9,
    max_tokens: 512,
    model: WEBLLM_MODEL_ID,
  })

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content
    if (delta) onChunk(delta)
  }
}

export function stopStreaming(engine: WebWorkerMLCEngine) {
  engine.interruptGenerate()
}
