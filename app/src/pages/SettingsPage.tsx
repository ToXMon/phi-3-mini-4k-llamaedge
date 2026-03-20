import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { getDefaultModel } from '../features/models/modelRegistry'
import { useModelManager } from '../features/models/modelManagerContext'
import styles from './SettingsPage.module.css'

function capitalizeFirst(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export default function SettingsPage() {
  const { metadata, downloadModel, deleteCachedModel } = useModelManager()
  const model = getDefaultModel()

  const statusValue =
    metadata.downloadStatus === 'downloading'
      ? `Downloading (${metadata.progress}%)`
      : capitalizeFirst(metadata.downloadStatus)

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>Configure your local AI experience.</p>

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
                <span className={styles.rowLabel}>Download status</span>
                <code className={styles.rowValue}>{statusValue}</code>
              </div>
            </div>
            <div className={styles.row}>
              <div className={styles.rowInfo}>
                <span className={styles.rowLabel}>Cached</span>
                <code className={styles.rowValue}>{metadata.cached ? 'yes' : 'no'}</code>
              </div>
            </div>
            <div className={styles.row}>
              <div className={styles.actions}>
                <Button
                  variant="secondary"
                  onClick={() => void downloadModel()}
                  loading={metadata.downloadStatus === 'downloading'}
                  disabled={metadata.downloadStatus === 'downloaded'}
                >
                  {metadata.downloadStatus === 'downloaded' ? 'Downloaded' : 'Download'}
                </Button>
                <Button
                  variant="danger"
                  onClick={deleteCachedModel}
                  disabled={!metadata.cached && metadata.downloadStatus !== 'error'}
                >
                  Delete cache
                </Button>
              </div>
            </div>
            {metadata.error && (
              <div className={styles.row}>
                <p className={styles.error}>{metadata.error}</p>
              </div>
            )}
          </Card>

          <Card className={styles.section}>
            <h2 className={styles.sectionTitle}>Storage</h2>
            <div className={styles.row}>
              <div className={styles.rowInfo}>
                <span className={styles.rowLabel}>Cache strategy</span>
                <code className={styles.rowValue}>Offline-first (Cache API)</code>
              </div>
            </div>
            <div className={styles.row}>
              <div className={styles.rowInfo}>
                <span className={styles.rowLabel}>Model storage</span>
                <code className={styles.rowValue}>IndexedDB</code>
              </div>
            </div>
          </Card>

          <Card className={styles.section}>
            <h2 className={styles.sectionTitle}>About</h2>
            <div className={styles.row}>
              <div className={styles.rowInfo}>
                <span className={styles.rowLabel}>Version</span>
                <code className={styles.rowValue}>0.1.0</code>
              </div>
            </div>
            <div className={styles.row}>
              <div className={styles.rowInfo}>
                <span className={styles.rowLabel}>PWA</span>
                <code className={styles.rowValue}>Offline-first · installable</code>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
