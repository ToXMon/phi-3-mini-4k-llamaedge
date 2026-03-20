import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { getDefaultModel, MODELS } from './modelRegistry'
import { getDefaultModelMetadata, loadModelMetadata, saveModelMetadata } from './modelStorage'
import type { ModelMetadata } from './types'
import { ModelManagerContext } from './modelManagerContext'
import { hasOfflineModelCache, recoverModelCache } from '../chat/webllmEngine'

const PROGRESS_STEP = 8
const PROGRESS_INTERVAL_MS = 250

export function ModelManagerProvider({ children }: { children: ReactNode }) {
  const [metadata, setMetadata] = useState<ModelMetadata>(() => loadModelMetadata())
  const timerRef = useRef<number | null>(null)
  const unmountedRef = useRef(false)

  useEffect(() => {
    saveModelMetadata(metadata)
  }, [metadata])

  useEffect(() => {
    let active = true

    const syncWithCache = async () => {
      const hasCache = await hasOfflineModelCache().catch(() => false)
      if (!active) return
      setMetadata((prev) => {
        if (prev.cached === hasCache) return prev
        const hasError = prev.downloadStatus === 'error'
        return {
          ...prev,
          cached: hasCache,
          downloadStatus: hasCache ? 'downloaded' : hasError ? 'error' : 'idle',
          progress: hasCache ? 100 : 0,
          updatedAt: new Date().toISOString(),
        }
      })
    }

    void syncWithCache()
    const handleOnline = () => void syncWithCache()
    window.addEventListener('online', handleOnline)
    return () => {
      active = false
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  useEffect(() => {
    unmountedRef.current = false
    return () => {
      unmountedRef.current = true
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
      error: null,
      progress: 0,
      updatedAt: new Date().toISOString(),
    }))

    try {
      await new Promise<void>((resolve, reject) => {
        timerRef.current = window.setInterval(() => {
          if (unmountedRef.current) {
            clearTimer()
            reject(new Error('Download cancelled during unmount'))
            return
          }

          if (!window.navigator.onLine) {
            clearTimer()
            setMetadata((prev) => ({
              ...prev,
              downloadStatus: 'error',
              error: 'Network lost during download. Please retry.',
              updatedAt: new Date().toISOString(),
            }))
            reject(new Error('Network lost during download. Please retry.'))
            return
          }

          setMetadata((prev) => {
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
      })
    } catch (error) {
      console.error(error)
    }
  }, [clearTimer])

  const deleteCachedModel = useCallback(() => {
    clearTimer()
    const defaultMetadata = getDefaultModelMetadata()
    void recoverModelCache().catch((error) => {
      console.error(error)
    })
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
