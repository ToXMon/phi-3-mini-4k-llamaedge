import Button from '../ui/Button'
import Card from '../ui/Card'
import type { ModelDefinition, ModelMetadata } from '../../features/models/types'
import styles from './ModelDownloadCard.module.css'

function formatBytes(value: number | null) {
  if (!value || !Number.isFinite(value) || value <= 0) return null
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let scaledValue = value
  let unitIndex = 0
  while (scaledValue >= 1024 && unitIndex < units.length - 1) {
    scaledValue /= 1024
    unitIndex += 1
  }
  return `${scaledValue.toFixed(scaledValue >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

function formatEta(seconds: number | null) {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return null
  if (seconds < 60) return `${seconds}s remaining`
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    return `${hours}h ${minutes % 60}m remaining`
  }
  return `${minutes}m ${remaining}s remaining`
}

function statusLabel(status: ModelMetadata['downloadStatus']) {
  switch (status) {
    case 'checking-cache':
      return 'Checking cache'
    case 'not-downloaded':
      return 'Not downloaded'
    case 'downloading':
      return 'Downloading'
    case 'verifying':
      return 'Verifying'
    case 'initializing':
      return 'Initializing'
    case 'ready':
      return 'Ready offline'
    case 'error':
      return 'Error'
    case 'idle':
    default:
      return 'Idle'
  }
}

function sourceDomain(url: string) {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

interface ModelDownloadCardProps {
  model: ModelDefinition
  metadata: ModelMetadata
  onRetry: () => Promise<void>
  onDelete: () => void
  onClearError: () => void
}

export default function ModelDownloadCard({
  model,
  metadata,
  onRetry,
  onDelete,
  onClearError,
}: ModelDownloadCardProps) {
  const downloaded = formatBytes(metadata.downloadedBytes)
  const total = formatBytes(metadata.totalBytes)
  const eta = formatEta(metadata.etaSeconds)
  const percentText = metadata.progress !== null ? `${metadata.progress}%` : null
  const progressValue = metadata.progress !== null ? metadata.progress : 12
  const isReady = metadata.downloadStatus === 'ready' || metadata.cached
  const isActive =
    metadata.downloadStatus === 'checking-cache' ||
    metadata.downloadStatus === 'downloading' ||
    metadata.downloadStatus === 'verifying' ||
    metadata.downloadStatus === 'initializing'

  return (
    <Card className={styles.card}>
      <div className={styles.top}>
        <div>
          <h2 className={styles.name}>{model.name}</h2>
          <p className={styles.description}>{model.description}</p>
        </div>
        <span className={`${styles.badge} ${isReady ? styles.ready : ''}`}>
          {statusLabel(metadata.downloadStatus)}
        </span>
      </div>

      <div className={styles.meta}>
        <p><strong>Estimated size:</strong> {model.estimatedSize}</p>
        <p><strong>Source:</strong> {sourceDomain(model.sourceUrl)}</p>
        <p><strong>Model URL:</strong> {model.sourceUrl}</p>
      </div>

      <p className={styles.copy}>
        This downloads the model into your browser storage so you can chat offline later.
      </p>
      <p className={styles.copyMuted}>
        Cached model files stay on this device (IndexedDB/Cache API). Once setup is complete, chats can run without network.
      </p>

      <div className={styles.progressWrap}>
        <div className={styles.progressLabels}>
          <span>{metadata.stageLabel ?? 'preparing download'}</span>
          <span>{percentText ?? 'In progress'}</span>
        </div>
        <div
          className={`${styles.progressBar} ${metadata.indeterminate ? styles.indeterminate : ''}`}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={metadata.progress ?? undefined}
          aria-label="Model setup progress"
        >
          <span style={{ width: `${progressValue}%` }} />
        </div>
        <div className={styles.progressDetails}>
          <span>{downloaded && total ? `${downloaded} / ${total}` : downloaded ? `${downloaded} downloaded` : 'Setup in progress…'}</span>
          <span>{eta ?? 'Estimated time remaining unavailable'}</span>
        </div>
      </div>

      {metadata.statusText && <p className={styles.statusText}>{metadata.statusText}</p>}
      {isReady && <p className={styles.readyText}>Ready offline</p>}
      {metadata.needsRecovery && (
        <p className={styles.warning}>
          Partial/corrupted cache detected. Delete cached model and retry setup.
        </p>
      )}
      {metadata.error && (
        <div className={styles.errorWrap}>
          <p className={styles.error}>{metadata.error}</p>
        </div>
      )}

      <div className={styles.actions}>
        <Button
          type="button"
          onClick={() => void onRetry()}
          disabled={isActive}
          variant={metadata.error ? 'danger' : 'primary'}
        >
          {metadata.error ? 'Retry setup' : isReady ? 'Re-download' : 'Download model'}
        </Button>
        <Button type="button" variant="secondary" onClick={onDelete} disabled={isActive}>
          Delete cached model
        </Button>
        {metadata.error && (
          <Button type="button" variant="ghost" onClick={onClearError}>
            Dismiss error
          </Button>
        )}
      </div>
    </Card>
  )
}
