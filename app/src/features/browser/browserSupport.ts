export interface BrowserSupport {
  supported: boolean
  missing: string[]
}

export function getBrowserSupport(): BrowserSupport {
  const missing: string[] = []

  if (!('Worker' in window)) missing.push('Web Workers')
  if (!('serviceWorker' in navigator)) missing.push('Service Workers')
  if (typeof navigator.storage?.estimate !== 'function') {
    missing.push('Storage estimation API')
  }
  if (!('indexedDB' in window)) missing.push('IndexedDB')
  if (!('gpu' in navigator)) missing.push('WebGPU')

  return {
    supported: missing.length === 0,
    missing,
  }
}
