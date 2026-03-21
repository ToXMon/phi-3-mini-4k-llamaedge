import { DEFAULT_MODEL_ID } from './modelRegistry'
import type { ModelMetadata } from './types'

const STORAGE_KEY = 'phi3:model-metadata:v1'

const DEFAULT_METADATA: ModelMetadata = {
  modelId: DEFAULT_MODEL_ID,
  downloadStatus: 'idle',
  cached: false,
  progress: null,
  downloadedBytes: null,
  totalBytes: null,
  etaSeconds: null,
  stageLabel: null,
  statusText: null,
  indeterminate: true,
  needsRecovery: false,
  error: null,
  updatedAt: null,
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function sanitizeMetadata(value: unknown): ModelMetadata {
  if (!isObject(value)) return DEFAULT_METADATA

  const modelId = typeof value.modelId === 'string' ? value.modelId : DEFAULT_METADATA.modelId
  const progress =
    typeof value.progress === 'number' ? Math.min(100, Math.max(0, value.progress)) : null
  const downloadedBytes = typeof value.downloadedBytes === 'number' ? Math.max(0, value.downloadedBytes) : null
  const totalBytes = typeof value.totalBytes === 'number' ? Math.max(0, value.totalBytes) : null
  const etaSeconds = typeof value.etaSeconds === 'number' ? Math.max(0, value.etaSeconds) : null
  const stageLabel = typeof value.stageLabel === 'string' ? value.stageLabel : null
  const statusText = typeof value.statusText === 'string' ? value.statusText : null
  const indeterminate = typeof value.indeterminate === 'boolean' ? value.indeterminate : progress === null
  const needsRecovery = typeof value.needsRecovery === 'boolean' ? value.needsRecovery : false
  const cached = typeof value.cached === 'boolean' ? value.cached : false
  const error = typeof value.error === 'string' ? value.error : null
  const updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : null
  const rawStatus = value.downloadStatus
  const downloadStatus =
    rawStatus === 'idle' ||
    rawStatus === 'checking-cache' ||
    rawStatus === 'not-downloaded' ||
    rawStatus === 'downloading' ||
    rawStatus === 'verifying' ||
    rawStatus === 'initializing' ||
    rawStatus === 'ready' ||
    rawStatus === 'error'
      ? rawStatus
      : DEFAULT_METADATA.downloadStatus

  return {
    modelId,
    progress,
    downloadedBytes,
    totalBytes,
    etaSeconds,
    stageLabel,
    statusText,
    indeterminate,
    needsRecovery,
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
    if (
      sanitized.downloadStatus === 'downloading' ||
      sanitized.downloadStatus === 'verifying' ||
      sanitized.downloadStatus === 'initializing' ||
      sanitized.downloadStatus === 'error'
    ) {
      const hasCompletedCache = sanitized.cached && sanitized.progress === 100
      return {
        ...DEFAULT_METADATA,
        modelId: sanitized.modelId,
        cached: hasCompletedCache,
        downloadStatus: hasCompletedCache ? 'ready' : 'not-downloaded',
        progress: hasCompletedCache ? 100 : null,
        statusText: hasCompletedCache ? 'Ready offline' : null,
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
