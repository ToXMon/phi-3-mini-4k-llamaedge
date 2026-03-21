import {
  CreateWebWorkerMLCEngine,
  deleteModelAllInfoInCache,
  hasModelInCache,
  prebuiltAppConfig,
  type AppConfig,
  type InitProgressReport,
  type MLCEngineConfig,
  type ModelRecord,
  type WebWorkerMLCEngine,
} from '@mlc-ai/web-llm'
import type { ChatMessage, ChatRole } from './types'

export const WEBLLM_MODEL_ID = 'Phi-3-mini-4k-instruct-q4f16_1-MLC'

// ---------------------------------------------------------------------------
// Error classification
// ---------------------------------------------------------------------------

export type InitErrorClass =
  | 'webgpu-unavailable'
  | 'adapter-unavailable'
  | 'unsupported-feature'
  | 'model-config-invalid'
  | 'model-download-failed'
  | 'storage-quota'
  | 'out-of-memory-or-device-lost'
  | 'unknown-init-error'

export function classifyInitError(caught: unknown): InitErrorClass {
  if (!(caught instanceof Error)) return 'unknown-init-error'
  const msg = caught.message.toLowerCase()

  if (msg.includes('webgpu is not supported') || (msg.includes('cannot read propert') && msg.includes('gpu')) || msg.includes('navigator.gpu') || msg.includes('navigator is not defined')) {
    return 'webgpu-unavailable'
  }
  if (msg.includes('requestadapter') || (msg.includes('adapter') && msg.includes('null'))) {
    return 'adapter-unavailable'
  }
  if (msg.includes('device lost') || msg.includes('devicelost') || msg.includes('out of memory') || msg.includes('oom')) {
    return 'out-of-memory-or-device-lost'
  }
  if (msg.includes('quota') || msg.includes('storage full') || msg.includes('no space')) {
    return 'storage-quota'
  }
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('failed to fetch') || (msg.includes('load') && msg.includes('failed'))) {
    return 'model-download-failed'
  }
  if (msg.includes('invalid') && (msg.includes('url') || msg.includes('config') || msg.includes('model'))) {
    return 'model-config-invalid'
  }
  if (msg.includes('unsupported') || msg.includes('feature') || msg.includes('not available')) {
    return 'unsupported-feature'
  }
  return 'unknown-init-error'
}

export function getUserFacingMessage(errorClass: InitErrorClass, rawMessage: string): string {
  switch (errorClass) {
    case 'webgpu-unavailable':
      return 'WebGPU is not available in this browser. Use Chrome 113+, Edge 113+, or another WebGPU-capable browser.'
    case 'adapter-unavailable':
      return 'No WebGPU adapter found. Your GPU driver or browser may need updating. Try a different browser or device.'
    case 'unsupported-feature':
      return `Your GPU does not support a required WebGPU feature. Try a different browser or device. (${rawMessage})`
    case 'model-config-invalid':
      return `The model configuration is invalid or the artifact URLs are unreachable. Check the model URL and retry. (${rawMessage})`
    case 'model-download-failed':
      return `Failed to download model artifacts. Check your internet connection and retry. (${rawMessage})`
    case 'storage-quota':
      return 'Browser storage quota exceeded. Free up disk space or clear site data, then retry.'
    case 'out-of-memory-or-device-lost':
      return 'The GPU ran out of memory or the device was lost. Try a smaller model or a device with more VRAM.'
    case 'unknown-init-error':
      return `Initialization failed: ${rawMessage}`
  }
}

// ---------------------------------------------------------------------------
// GPU diagnostics helpers
// ---------------------------------------------------------------------------

interface GpuAdapterInfo {
  vendor: string
  architecture: string
  device: string
  description: string
}

interface GpuDiagnostics {
  gpuPresent: boolean
  adapterFound: boolean
  adapterInfo: GpuAdapterInfo | null
  features: string[]
  limits: Record<string, number | bigint>
}

export async function collectGpuDiagnostics(): Promise<GpuDiagnostics> {
  const base: GpuDiagnostics = {
    gpuPresent: 'gpu' in navigator,
    adapterFound: false,
    adapterInfo: null,
    features: [],
    limits: {},
  }

  if (!('gpu' in navigator)) return base

  try {
    const gpu = (navigator as Navigator & { gpu: { requestAdapter: (opts?: unknown) => Promise<unknown> } }).gpu
    const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' })
    if (!adapter) return base

    const typedAdapter = adapter as {
      info?: { vendor?: string; architecture?: string; device?: string; description?: string }
      requestAdapterInfo?: () => Promise<{ vendor?: string; architecture?: string; device?: string; description?: string }>
      features: { has: (f: string) => boolean; forEach?: (cb: (v: string) => void) => void; [Symbol.iterator]?: () => Iterator<string> }
      limits: Record<string, number | bigint>
    }

    // Gather adapter info (newer browsers expose adapter.info directly)
    let adapterInfo: GpuAdapterInfo | null = null
    if (typedAdapter.info) {
      const i = typedAdapter.info
      adapterInfo = {
        vendor: i.vendor ?? '',
        architecture: i.architecture ?? '',
        device: i.device ?? '',
        description: i.description ?? '',
      }
    } else if (typeof typedAdapter.requestAdapterInfo === 'function') {
      try {
        const i = await typedAdapter.requestAdapterInfo()
        adapterInfo = {
          vendor: i.vendor ?? '',
          architecture: i.architecture ?? '',
          device: i.device ?? '',
          description: i.description ?? '',
        }
      } catch {
        // ignore
      }
    }

    // Gather features
    const features: string[] = []
    if (typedAdapter.features) {
      try {
        for (const f of typedAdapter.features as unknown as Iterable<string>) {
          features.push(String(f))
        }
      } catch {
        if (typeof typedAdapter.features.forEach === 'function') {
          typedAdapter.features.forEach((v) => features.push(v))
        }
      }
    }

    // Gather limits (numeric properties - iterate both own and prototype properties of the limits object)
    const limits: Record<string, number | bigint> = {}
    const limitsObj = typedAdapter.limits as Record<string, unknown>
    const allKeys = new Set([
      ...Object.keys(limitsObj),
      ...Object.getOwnPropertyNames(Object.getPrototypeOf(limitsObj) ?? {}),
    ])
    for (const key of allKeys) {
      const val = limitsObj[key]
      if ((typeof val === 'number' || typeof val === 'bigint') && key !== 'constructor') {
        limits[key] = val
      }
    }

    return { gpuPresent: true, adapterFound: true, adapterInfo, features, limits }
  } catch {
    return base
  }
}

export async function logInitFailure(
  caught: unknown,
  errorClass: InitErrorClass,
  modelId: string,
  artifactUrls: string[],
): Promise<void> {
  const error = caught instanceof Error ? caught : new Error(String(caught))
  console.error('[webllm] init failed', {
    errorClass,
    modelId,
    artifactUrls,
    message: error.message,
    stack: error.stack,
  })

  const diagnostics = await collectGpuDiagnostics().catch(() => null)
  if (diagnostics) {
    console.error('[webllm] gpu diagnostics', diagnostics)
  }
}

// ---------------------------------------------------------------------------
// Model record helpers
// ---------------------------------------------------------------------------

function getModelRecord(modelId: string): ModelRecord {
  const record = prebuiltAppConfig.model_list.find((item) => item.model_id === modelId)
  if (!record) {
    throw new Error(`WebLLM model "${modelId}" is not available in this build.`)
  }
  return record
}

/**
 * Validate a model record before attempting to initialize.
 * Throws with errorClass `model-config-invalid` if invalid.
 */
export function validateModelRecord(record: ModelRecord): void {
  if (!record.model_id || typeof record.model_id !== 'string') {
    throw new Error('Model record is missing a valid model_id.')
  }
  if (!record.model) {
    throw new Error(`Model record "${record.model_id}" is missing the model URL.`)
  }
  try {
    new URL(record.model)
  } catch {
    throw new Error(`Model record "${record.model_id}" has an invalid model URL: ${record.model}`)
  }
}

/**
 * Returns the artifact URLs from a model record for diagnostic logging.
 */
export function getArtifactUrls(record: ModelRecord): string[] {
  const urls: string[] = []
  if (record.model) urls.push(record.model)
  if (record.model_lib) urls.push(record.model_lib)
  return urls
}

export const MODEL_RECORD = getModelRecord(WEBLLM_MODEL_ID)

const APP_CONFIG: AppConfig = {
  model_list: [MODEL_RECORD],
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
  // Validate the built-in model config before attempting init
  validateModelRecord(MODEL_RECORD)

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

export async function hasOfflineModelCache() {
  return hasModelInCache(WEBLLM_MODEL_ID, APP_CONFIG)
}

export async function recoverModelCache() {
  await deleteModelAllInfoInCache(WEBLLM_MODEL_ID, APP_CONFIG)
  enginePromise = null
}
