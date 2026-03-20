import styles from './Header.module.css'
import { useChatManager } from '../../features/chat/chatManagerContext'

interface HeaderProps {
  onMenuClick: () => void
  isMobile: boolean
}

export default function Header({ onMenuClick, isMobile }: HeaderProps) {
  const { status, progressText } = useChatManager()

  const statusLabel =
    status === 'initializing'
      ? 'Initializing'
      : status === 'downloading'
        ? 'Downloading'
        : status === 'ready'
          ? 'Ready'
          : status === 'generating'
            ? 'Generating'
            : status === 'error'
              ? 'Error'
              : 'Idle'

  const statusClass =
    status === 'ready'
      ? styles.statusReady
      : status === 'error'
        ? styles.statusError
        : status === 'generating' || status === 'initializing' || status === 'downloading'
          ? styles.statusDownloading
          : styles.statusIdle

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {isMobile && (
          <button
            className={styles.menuBtn}
            onClick={onMenuClick}
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 12h18M3 6h18M3 18h18"/>
            </svg>
          </button>
        )}
        {isMobile && (
          <div className={styles.mobileLogo}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="var(--color-accent)"/>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Phi-3 Mini</span>
          </div>
        )}
      </div>

      <div className={styles.right}>
        <div className={`${styles.statusPill} ${statusClass}`}>
          <span className={styles.statusDot} />
          <span>{statusLabel}</span>
        </div>
        {!isMobile && progressText && (
          <span className={styles.progressText}>{progressText}</span>
        )}
      </div>
    </header>
  )
}
