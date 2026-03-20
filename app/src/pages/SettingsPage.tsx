import Card from '../components/ui/Card'
import { getDefaultModel } from '../features/models/modelRegistry'
import { useStorageQuota } from '../hooks/useStorageQuota'
import styles from './SettingsPage.module.css'

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value < 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let scaledValue = value
  let unitIndex = 0
  while (scaledValue >= 1024 && unitIndex < units.length - 1) {
    scaledValue /= 1024
    unitIndex += 1
  }
  return `${scaledValue.toFixed(scaledValue >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

export default function SettingsPage() {
  const model = getDefaultModel()
  const quota = useStorageQuota()
  const quotaMessage = quota.supported
    ? `${formatBytes(quota.usageBytes)} / ${formatBytes(quota.quotaBytes)} used (${quota.usagePercent}%)`
    : 'Browser does not expose storage quota estimation.'
  const quotaWarning = quota.supported && quota.usagePercent >= 90

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>Review local model, storage, and browser requirements before you chat.</p>

        <div className={styles.sections}>
          <Card className={styles.section}>
            <h2 className={styles.sectionTitle}>Model</h2>
            <div className={styles.row}>
              <div className={styles.rowInfo}>
                <span className={styles.rowLabel}>Model name</span>
                <code className={styles.rowValue}>{model.name}</code>
              </div>
            </div>
            <div className={styles.row}>
              <div className={styles.rowInfo}>
                <span className={styles.rowLabel}>Model size</span>
                <code className={styles.rowValue}>{model.size}</code>
              </div>
            </div>
            <div className={styles.row}>
              <div className={styles.rowInfo}>
                <span className={styles.rowLabel}>WebLLM model ID</span>
                <code className={styles.rowValue}>{model.webllmModelId ?? 'n/a'}</code>
              </div>
            </div>
          </Card>

          <Card className={styles.section}>
            <h2 className={styles.sectionTitle}>Storage</h2>
            <div className={styles.row}>
              <div className={styles.rowInfo}>
                <span className={styles.rowLabel}>Model artifacts</span>
                <code className={styles.rowValue}>IndexedDB / Cache API (WebLLM-managed)</code>
              </div>
            </div>
            <div className={styles.row}>
              <div className={styles.rowInfo}>
                <span className={styles.rowLabel}>Chat history</span>
                <code className={styles.rowValue}>localStorage (this browser only)</code>
              </div>
            </div>
            <div className={styles.row}>
              <div className={styles.rowInfo}>
                <span className={styles.rowLabel}>Storage usage</span>
                <code className={styles.rowValue}>{quotaMessage}</code>
              </div>
            </div>
            {quotaWarning && (
              <div className={styles.row}>
                <p className={styles.error}>
                  Storage is almost full. Downloads or cache updates may fail until you free up device space.
                </p>
              </div>
            )}
          </Card>

          <Card className={styles.section}>
            <h2 className={styles.sectionTitle}>Requirements</h2>
            <div className={styles.row}>
              <div className={styles.rowInfo}>
                <span className={styles.rowLabel}>Inference mode</span>
                <code className={styles.rowValue}>Local-only (no backend, no remote inference)</code>
              </div>
            </div>
            <div className={styles.row}>
              <div className={styles.rowInfo}>
                <span className={styles.rowLabel}>Browser</span>
                <code className={styles.rowValue}>WebGPU-capable browser required</code>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
