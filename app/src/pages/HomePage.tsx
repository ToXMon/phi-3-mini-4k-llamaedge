import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { getDefaultModel } from '../features/models/modelRegistry'
import { useModelManager } from '../features/models/modelManagerContext'
import styles from './HomePage.module.css'

const capabilities = [
  {
    icon: '⚡',
    title: 'Runs Locally',
    description: 'All inference happens in your browser using WebGPU. Your data never leaves your device.',
  },
  {
    icon: '📴',
    title: 'Works Offline',
    description: 'Once the model is downloaded, the app works completely offline—no internet required.',
  },
  {
    icon: '🔒',
    title: 'Private by Default',
    description: 'No accounts, no telemetry, no cloud calls. Fully private conversations every time.',
  },
]

export default function HomePage() {
  const { metadata, downloadModel } = useModelManager()
  const model = getDefaultModel()

  const ctaLabel =
    metadata.downloadStatus === 'downloading'
      ? `Downloading ${metadata.progress}%`
      : metadata.downloadStatus === 'downloaded'
        ? 'Model Cached'
        : metadata.downloadStatus === 'error'
          ? 'Retry Download'
        : 'Download Model'

  return (
    <div className={styles.page}>
      <div className={styles.emptyState}>
        <div className={styles.hero}>
          <div className={styles.heroIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="var(--color-accent)"/>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className={styles.heroTitle}>{model.name}</h1>
          <p className={styles.heroSubtitle}>
            A powerful 4K-context language model running entirely in your browser.
          </p>
          <Button
            size="lg"
            className={styles.ctaBtn}
            onClick={() => void downloadModel()}
            loading={metadata.downloadStatus === 'downloading'}
            disabled={metadata.downloadStatus === 'downloaded'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {ctaLabel}
          </Button>
          {metadata.downloadStatus === 'error' && metadata.error && (
            <p className={styles.error}>{metadata.error}</p>
          )}
        </div>

        <div className={styles.capabilities}>
          {capabilities.map(cap => (
            <Card key={cap.title} glass className={styles.capCard}>
              <div className={styles.capIcon}>{cap.icon}</div>
              <h3 className={styles.capTitle}>{cap.title}</h3>
              <p className={styles.capDesc}>{cap.description}</p>
            </Card>
          ))}
        </div>

        <div className={styles.modelInfo}>
          <div className={styles.modelInfoInner}>
            <span className={styles.modelInfoLabel}>Model</span>
            <code className={styles.modelInfoValue}>{model.id}</code>
            <span className={styles.modelInfoSep}>·</span>
            <span className={styles.modelInfoLabel}>Size</span>
            <code className={styles.modelInfoValue}>{model.size}</code>
            <span className={styles.modelInfoSep}>·</span>
            <span className={styles.modelInfoLabel}>Status</span>
            <code className={styles.modelInfoValue}>{metadata.downloadStatus}</code>
            <span className={styles.modelInfoSep}>·</span>
            <span className={styles.modelInfoLabel}>Cached</span>
            <code className={styles.modelInfoValue}>{metadata.cached ? 'yes' : 'no'}</code>
          </div>
        </div>
      </div>
    </div>
  )
}
