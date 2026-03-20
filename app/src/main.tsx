import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App'
import { ModelManagerProvider } from './features/models/modelManagerContext'
import { ChatManagerProvider } from './features/chat/chatManagerContext'
import { getBrowserSupport } from './features/browser/browserSupport'
import UnsupportedBrowserPage from './pages/UnsupportedBrowserPage'

const browserSupport = getBrowserSupport()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {browserSupport.supported ? (
      <ModelManagerProvider>
        <ChatManagerProvider>
          <App />
        </ChatManagerProvider>
      </ModelManagerProvider>
    ) : (
      <UnsupportedBrowserPage missing={browserSupport.missing} />
    )}
  </StrictMode>
)
