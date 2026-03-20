import { DEFAULT_MODEL_ID } from './modelRegistry'
import type { ModelMetadata } from './types'

const STORAGE_KEY = 'phi3:model-metadata:v1'

const DEFAULT_METADATA: ModelMetadata = {
  modelId: DEFAULT_MODEL_ID,
  downloadStatus: 'idle',
  cached: false,
  progress: 0,
  error: null,
  updatedAt: null,
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function sanitizeMetadata(value: unknown): ModelMetadata {
  if (!isObject(value)) return DEFAULT_METADATA

  const modelId = typeof value.modelId === 'string' ? value.modelId : DEFAULT_METADATA.modelId
  const progress = typeof value.progress === 'number' ? Math.min(100, Math.max(0, value.progress)) : 0
  const cached = typeof value.cached === 'boolean' ? value.cached : false
  const error = typeof value.error === 'string' ? value.error : null
  const updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : null
  const rawStatus = value.downloadStatus
  const downloadStatus =
    rawStatus === 'downloading' ||
    rawStatus === 'downloaded' ||
    rawStatus === 'error' ||
    rawStatus === 'idle'
      ? rawStatus
      : DEFAULT_METADATA.downloadStatus

  return {
    modelId,
    progress,
    cached,
    error,
    updatedAt,
    downloadStatus,
  }
}

export function loadModelMetadata(): ModelMetadata {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_METADATA
    const sanitized = sanitizeMetadata(JSON.parse(raw))
    if (sanitized.downloadStatus === 'downloading' || sanitized.downloadStatus === 'error') {
      const hasCompletedCache = sanitized.cached && sanitized.progress === 100
      return {
        ...DEFAULT_METADATA,
        modelId: sanitized.modelId,
        cached: hasCompletedCache,
        downloadStatus: hasCompletedCache ? 'downloaded' : 'idle',
        progress: hasCompletedCache ? 100 : 0,
      }
    }
    return sanitized
  } catch {
    return DEFAULT_METADATA
  }
}

export function saveModelMetadata(metadata: ModelMetadata) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeMetadata(metadata)))
}

export function clearModelMetadata() {
  window.localStorage.removeItem(STORAGE_KEY)
}

export function getDefaultModelMetadata() {
  return { ...DEFAULT_METADATA }
}
