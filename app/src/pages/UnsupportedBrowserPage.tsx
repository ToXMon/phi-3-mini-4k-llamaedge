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
          This app needs modern browser features for offline local inference. Please switch to a compatible browser/device.
        </p>
        <ul className={styles.list}>
          {missing.map((feature) => (
            <li key={feature}>{feature} is not available in this browser</li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
