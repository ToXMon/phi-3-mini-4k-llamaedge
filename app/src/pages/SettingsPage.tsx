import Card from '../components/ui/Card'
import { getDefaultModel } from '../features/models/modelRegistry'
import styles from './SettingsPage.module.css'

export default function SettingsPage() {
  const model = getDefaultModel()

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>Model and storage details for local-only chat.</p>

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
