import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { getDefaultModel, MODELS } from './modelRegistry'
import { getDefaultModelMetadata, loadModelMetadata, saveModelMetadata } from './modelStorage'
import type { ModelMetadata } from './types'
import { ModelManagerContext } from './modelManagerContext'

const PROGRESS_STEP = 8
const PROGRESS_INTERVAL_MS = 250

export function ModelManagerProvider({ children }: { children: ReactNode }) {
  const [metadata, setMetadata] = useState<ModelMetadata>(() => loadModelMetadata())
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    saveModelMetadata(metadata)
  }, [metadata])

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current)
      }
    }
  }, [])

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const clearDownloadError = useCallback(() => {
    setMetadata((prev) => ({
      ...prev,
      error: null,
      downloadStatus: prev.cached ? 'downloaded' : 'idle',
      progress: prev.cached ? 100 : 0,
      updatedAt: new Date().toISOString(),
    }))
  }, [])

  const downloadModel = useCallback(async () => {
    clearTimer()
    setMetadata((prev) => ({
      ...prev,
      downloadStatus: 'downloading',
      cached: false,
      error: null,
      progress: 0,
      updatedAt: new Date().toISOString(),
    }))

    await new Promise<void>((resolve, reject) => {
      timerRef.current = window.setInterval(() => {
        setMetadata((prev) => {
          if (!window.navigator.onLine) {
            clearTimer()
            reject(new Error('Network lost during download. Please retry.'))
            return {
              ...prev,
              downloadStatus: 'error',
              cached: false,
              error: 'Network lost during download. Please retry.',
              updatedAt: new Date().toISOString(),
            }
          }

          const nextProgress = Math.min(100, prev.progress + PROGRESS_STEP)
          if (nextProgress >= 100) {
            clearTimer()
            resolve()
            return {
              ...prev,
              downloadStatus: 'downloaded',
              cached: true,
              error: null,
              progress: 100,
              updatedAt: new Date().toISOString(),
            }
          }

          return {
            ...prev,
            progress: nextProgress,
            updatedAt: new Date().toISOString(),
          }
        })
      }, PROGRESS_INTERVAL_MS)
    }).catch(() => undefined)
  }, [clearTimer])

  const deleteCachedModel = useCallback(() => {
    clearTimer()
    const defaultMetadata = getDefaultModelMetadata()
    setMetadata({
      ...defaultMetadata,
      modelId: getDefaultModel().id,
      updatedAt: new Date().toISOString(),
    })
  }, [clearTimer])

  const value = useMemo(() => {
    return {
      models: MODELS,
      metadata,
      downloadModel,
      deleteCachedModel,
      clearDownloadError,
    }
  }, [clearDownloadError, deleteCachedModel, downloadModel, metadata])

  return <ModelManagerContext.Provider value={value}>{children}</ModelManagerContext.Provider>
}
