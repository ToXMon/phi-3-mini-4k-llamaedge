import Card from '../components/ui/Card'
import styles from './UnsupportedBrowserPage.module.css'

interface UnsupportedBrowserPageProps {
  missing: string[]
}

export default function UnsupportedBrowserPage({ missing }: UnsupportedBrowserPageProps) {
  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <h1 className={styles.title}>Browser not supported</h1>
        <p className={styles.subtitle}>
          This app needs modern browser capabilities to run local, offline inference. Switch to a compatible browser or newer device.
        </p>
        <p className={styles.helper}>
          Recommended: latest Chrome, Edge, or another WebGPU-enabled browser on desktop or high-memory mobile hardware.
        </p>
        <ul className={styles.list}>
          {missing.map((feature) => (
            <li key={feature}><strong>{feature}</strong> is unavailable in this browser</li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
