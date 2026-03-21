import { createContext, useContext } from 'react'
import { MODELS } from './modelRegistry'
import type { DownloadStatus, ModelMetadata } from './types'

export interface ModelLifecycleUpdate {
  downloadStatus: DownloadStatus
  progress?: number | null
  downloadedBytes?: number | null
  totalBytes?: number | null
  etaSeconds?: number | null
  stageLabel?: string | null
  statusText?: string | null
  indeterminate?: boolean
  error?: string | null
  cached?: boolean
  needsRecovery?: boolean
}

export interface ModelManagerValue {
  models: typeof MODELS
  metadata: ModelMetadata
  downloadModel: () => Promise<void>
  deleteCachedModel: () => void
  clearDownloadError: () => void
  updateLifecycle: (update: ModelLifecycleUpdate) => void
}

export const ModelManagerContext = createContext<ModelManagerValue | undefined>(undefined)

export { ModelManagerProvider } from './ModelManagerProvider'

export function useModelManager() {
  const context = useContext(ModelManagerContext)
  if (!context) {
    throw new Error('useModelManager must be used within ModelManagerProvider')
  }
  return context
}
