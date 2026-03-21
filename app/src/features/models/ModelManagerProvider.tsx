import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getDefaultModel, MODELS } from './modelRegistry'
import { getDefaultModelMetadata, loadModelMetadata, saveModelMetadata } from './modelStorage'
import type { ModelMetadata } from './types'
import { ModelManagerContext, type ModelLifecycleUpdate } from './modelManagerContext'
import { hasOfflineModelCache, recoverModelCache } from '../chat/webllmEngine'

export function ModelManagerProvider({ children }: { children: ReactNode }) {
  const [metadata, setMetadata] = useState<ModelMetadata>(() => loadModelMetadata())

  useEffect(() => {
    saveModelMetadata(metadata)
  }, [metadata])

  useEffect(() => {
    let active = true

    const syncWithCache = async () => {
      setMetadata((prev) => ({
        ...prev,
        downloadStatus: 'checking-cache',
        stageLabel: 'checking local cache',
        statusText: 'Checking whether model artifacts are already stored locally…',
        indeterminate: true,
        updatedAt: new Date().toISOString(),
      }))
      const hasCache = await hasOfflineModelCache().catch(() => false)
      if (!active) return
      setMetadata((prev) => {
        const hasError = prev.downloadStatus === 'error'
        return {
          ...prev,
          cached: hasCache,
          downloadStatus: hasCache ? 'ready' : hasError ? 'error' : 'not-downloaded',
          progress: hasCache ? 100 : null,
          downloadedBytes: hasCache ? prev.downloadedBytes : null,
          totalBytes: hasCache ? prev.totalBytes : null,
          etaSeconds: null,
          stageLabel: hasCache ? 'ready for offline chat' : 'not downloaded',
          statusText: hasCache
            ? 'Ready offline'
            : 'Model is not downloaded yet. Start setup to cache it in this browser.',
          indeterminate: !hasCache,
          needsRecovery: !hasCache && prev.downloadStatus === 'error',
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

  const clearDownloadError = useCallback(() => {
    setMetadata((prev) => ({
      ...prev,
      error: null,
      needsRecovery: false,
      downloadStatus: prev.cached ? 'ready' : 'not-downloaded',
      progress: prev.cached ? 100 : null,
      stageLabel: prev.cached ? 'ready for offline chat' : 'not downloaded',
      statusText: prev.cached ? 'Ready offline' : 'Model setup pending',
      indeterminate: !prev.cached,
      updatedAt: new Date().toISOString(),
    }))
  }, [])

  const updateLifecycle = useCallback((update: ModelLifecycleUpdate) => {
    setMetadata((prev) => ({
      ...prev,
      downloadStatus: update.downloadStatus,
      progress: update.progress !== undefined ? update.progress : prev.progress,
      downloadedBytes:
        update.downloadedBytes !== undefined ? update.downloadedBytes : prev.downloadedBytes,
      totalBytes: update.totalBytes !== undefined ? update.totalBytes : prev.totalBytes,
      etaSeconds: update.etaSeconds !== undefined ? update.etaSeconds : prev.etaSeconds,
      stageLabel: update.stageLabel !== undefined ? update.stageLabel : prev.stageLabel,
      statusText: update.statusText !== undefined ? update.statusText : prev.statusText,
      indeterminate:
        update.indeterminate !== undefined
          ? update.indeterminate
          : update.progress === null
            ? true
            : prev.indeterminate,
      error: update.error !== undefined ? update.error : prev.error,
      cached: update.cached !== undefined ? update.cached : prev.cached,
      needsRecovery: update.needsRecovery !== undefined ? update.needsRecovery : prev.needsRecovery,
      updatedAt: new Date().toISOString(),
    }))
  }, [])

  const downloadModel = useCallback(async () => {
    updateLifecycle({
      downloadStatus: 'initializing',
      stageLabel: 'preparing download',
      statusText: 'Preparing model setup…',
      progress: null,
      downloadedBytes: null,
      totalBytes: null,
      etaSeconds: null,
      indeterminate: true,
      error: null,
      needsRecovery: false,
    })

    try {
      await recoverModelCache()
      updateLifecycle({
        downloadStatus: 'not-downloaded',
        stageLabel: 'not downloaded',
        statusText: 'Model cache cleared. Send a message to start a fresh download.',
        progress: null,
        downloadedBytes: null,
        totalBytes: null,
        etaSeconds: null,
        indeterminate: true,
        cached: false,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to prepare model setup.'
      console.error('model download preparation failed', error)
      updateLifecycle({
        downloadStatus: 'error',
        error: message,
        statusText: message,
        stageLabel: 'setup failed',
        indeterminate: true,
      })
    }
  }, [updateLifecycle])

  const deleteCachedModel = useCallback(() => {
    void (async () => {
      try {
        await recoverModelCache()
        const defaultMetadata = getDefaultModelMetadata()
        setMetadata({
          ...defaultMetadata,
          modelId: getDefaultModel().id,
          downloadStatus: 'not-downloaded',
          stageLabel: 'not downloaded',
          statusText: 'Model cache deleted. Download again to use offline chat.',
          indeterminate: true,
          updatedAt: new Date().toISOString(),
        })
      } catch (error) {
        console.error('failed to delete model cache', error)
        setMetadata((prev) => ({
          ...prev,
          downloadStatus: 'error',
          stageLabel: 'setup failed',
          statusText: 'Failed to clear cached model artifacts. Please retry.',
          needsRecovery: true,
          error: 'Failed to clear cached model artifacts. Please retry.',
          updatedAt: new Date().toISOString(),
        }))
      }
    })()
  }, [])

  const value = useMemo(() => {
    return {
      models: MODELS,
      metadata,
      downloadModel,
      deleteCachedModel,
      clearDownloadError,
      updateLifecycle,
    }
  }, [clearDownloadError, deleteCachedModel, downloadModel, metadata, updateLifecycle])

  return <ModelManagerContext.Provider value={value}>{children}</ModelManagerContext.Provider>
}
