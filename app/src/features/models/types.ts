export type DownloadStatus = 'idle' | 'downloading' | 'downloaded' | 'error'

export interface ModelDefinition {
  id: string
  name: string
  size: string
  isDefault?: boolean
  webllmModelId?: string
}

export interface ModelMetadata {
  modelId: string
  downloadStatus: DownloadStatus
  cached: boolean
  progress: number
  error: string | null
  updatedAt: string | null
}
