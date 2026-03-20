import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import MobileNav from './MobileNav'
import styles from './AppShell.module.css'
import { usePWA } from '../../hooks/usePWA'

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const { isOnline } = usePWA()

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <div className={styles.shell}>
      {!isMobile && <Sidebar />}

      {isMobile && sidebarOpen && (
        <>
          <div
            className={styles.backdrop}
            onClick={() => setSidebarOpen(false)}
          />
          <Sidebar mobile onClose={() => setSidebarOpen(false)} />
        </>
      )}

      <div className={styles.content}>
        <Header onMenuClick={() => setSidebarOpen(true)} isMobile={isMobile} />
        {!isOnline && (
          <div className={styles.offlineBanner} role="status">
            You are offline. Cached app shell is active.
          </div>
        )}
        <main className={styles.main}>
          <Outlet />
        </main>
        {isMobile && <MobileNav />}
      </div>
    </div>
  )
}
