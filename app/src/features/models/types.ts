export type DownloadStatus =
  | 'idle'
  | 'checking-cache'
  | 'not-downloaded'
  | 'downloading'
  | 'verifying'
  | 'initializing'
  | 'ready'
  | 'error'

export interface ModelDefinition {
  id: string
  name: string
  description: string
  estimatedSize: string
  sourceUrl: string
  isDefault?: boolean
  webllmModelId?: string
}

export interface ModelMetadata {
  modelId: string
  downloadStatus: DownloadStatus
  cached: boolean
  progress: number | null
  downloadedBytes: number | null
  totalBytes: number | null
  etaSeconds: number | null
  stageLabel: string | null
  statusText: string | null
  indeterminate: boolean
  needsRecovery: boolean
  error: string | null
  updatedAt: string | null
}
