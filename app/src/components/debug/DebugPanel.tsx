import { useEffect, useState } from 'react'
import { collectGpuDiagnostics, getArtifactUrls, MODEL_RECORD, WEBLLM_MODEL_ID } from '../../features/chat/webllmEngine'
import styles from './DebugPanel.module.css'

interface GpuDiagnosticsSnapshot {
  gpuPresent: boolean
  adapterFound: boolean
  adapterInfo: { vendor: string; architecture: string; device: string; description: string } | null
  features: string[]
  limits: Record<string, number | bigint>
}

interface DebugPanelProps {
  initStage: string
}

export default function DebugPanel({ initStage }: DebugPanelProps) {
  const [diagnostics, setDiagnostics] = useState<GpuDiagnosticsSnapshot | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    collectGpuDiagnostics()
      .then((result) => {
        if (!cancelled) setDiagnostics(result)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [open])

  const artifactUrls = getArtifactUrls(MODEL_RECORD)

  return (
    <details
      className={styles.panel}
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className={styles.summary}>🛠 Debug Panel (dev only)</summary>
      <div className={styles.content}>
        <section className={styles.section}>
          <h3 className={styles.heading}>Model</h3>
          <dl className={styles.dl}>
            <div className={styles.row}>
              <dt>Model ID</dt>
              <dd><code>{WEBLLM_MODEL_ID}</code></dd>
            </div>
            <div className={styles.row}>
              <dt>Init Stage</dt>
              <dd><code>{initStage}</code></dd>
            </div>
            <div className={styles.row}>
              <dt>Artifact URLs</dt>
              <dd>
                {artifactUrls.length === 0 ? (
                  <span className={styles.missing}>none resolved</span>
                ) : (
                  <ul className={styles.urlList}>
                    {artifactUrls.map((url) => (
                      <li key={url}><code>{url}</code></li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section className={styles.section}>
          <h3 className={styles.heading}>WebGPU</h3>
          <dl className={styles.dl}>
            <div className={styles.row}>
              <dt>navigator.gpu</dt>
              <dd className={diagnostics?.gpuPresent ? styles.yes : styles.no}>
                {diagnostics === null ? '…' : diagnostics.gpuPresent ? 'present' : 'absent'}
              </dd>
            </div>
            <div className={styles.row}>
              <dt>Adapter</dt>
              <dd className={diagnostics?.adapterFound ? styles.yes : styles.no}>
                {diagnostics === null ? '…' : diagnostics.adapterFound ? 'found' : 'not found'}
              </dd>
            </div>
          </dl>

          {diagnostics?.adapterInfo && (
            <>
              <h4 className={styles.subheading}>Adapter Info</h4>
              <dl className={styles.dl}>
                {Object.entries(diagnostics.adapterInfo).map(([key, val]) => (
                  <div key={key} className={styles.row}>
                    <dt>{key}</dt>
                    <dd><code>{String(val) || '(empty)'}</code></dd>
                  </div>
                ))}
              </dl>
            </>
          )}

          {diagnostics?.features && diagnostics.features.length > 0 && (
            <>
              <h4 className={styles.subheading}>Features</h4>
              <ul className={styles.featureList}>
                {diagnostics.features.map((f) => (
                  <li key={f}><code>{f}</code></li>
                ))}
              </ul>
            </>
          )}

          {diagnostics?.limits && Object.keys(diagnostics.limits).length > 0 && (
            <>
              <h4 className={styles.subheading}>Limits</h4>
              <dl className={styles.dl}>
                {Object.entries(diagnostics.limits).map(([key, val]) => (
                  <div key={key} className={styles.row}>
                    <dt>{key}</dt>
                    <dd><code>{String(val)}</code></dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </section>
      </div>
    </details>
  )
}
