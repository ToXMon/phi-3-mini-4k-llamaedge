import { createContext, useContext } from 'react'
import { MODELS } from './modelRegistry'
import type { ModelMetadata } from './types'

export interface ModelManagerValue {
  models: typeof MODELS
  metadata: ModelMetadata
  downloadModel: () => Promise<void>
  deleteCachedModel: () => void
  clearDownloadError: () => void
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
