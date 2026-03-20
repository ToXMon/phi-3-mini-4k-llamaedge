import { useEffect, useState } from 'react'

export interface StorageQuotaState {
  usageBytes: number
  quotaBytes: number
  usagePercent: number
  supported: boolean
}

const EMPTY_QUOTA: StorageQuotaState = {
  usageBytes: 0,
  quotaBytes: 0,
  usagePercent: 0,
  supported: false,
}

export function useStorageQuota() {
  const [state, setState] = useState<StorageQuotaState>(EMPTY_QUOTA)

  useEffect(() => {
    let active = true

    const load = async () => {
      if (!('storage' in navigator) || typeof navigator.storage?.estimate !== 'function') {
        if (active) setState(EMPTY_QUOTA)
        return
      }

      const estimate = await navigator.storage.estimate()
      if (!active) return
      const usageBytes = estimate.usage ?? 0
      const quotaBytes = estimate.quota ?? 0
      const usagePercent = quotaBytes > 0 ? Math.min(100, Math.round((usageBytes / quotaBytes) * 100)) : 0
      setState({
        usageBytes,
        quotaBytes,
        usagePercent,
        supported: true,
      })
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  return state
}
