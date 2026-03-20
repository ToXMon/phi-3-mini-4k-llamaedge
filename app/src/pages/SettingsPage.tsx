import Card from '../components/ui/Card'
import styles from './SettingsPage.module.css'

export default function SettingsPage() {
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
                <span className={styles.rowLabel}>Model ID</span>
                <code className={styles.rowValue}>phi-3-mini-4k-instruct</code>
              </div>
            </div>
            <div className={styles.row}>
              <div className={styles.rowInfo}>
                <span className={styles.rowLabel}>Context length</span>
                <code className={styles.rowValue}>4096 tokens</code>
              </div>
            </div>
            <div className={styles.row}>
              <div className={styles.rowInfo}>
                <span className={styles.rowLabel}>Inference backend</span>
                <code className={styles.rowValue}>WebGPU / WASM</code>
              </div>
            </div>
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
