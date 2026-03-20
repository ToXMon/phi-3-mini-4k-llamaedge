import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App'
import { ModelManagerProvider } from './features/models/modelManagerContext'
import { ChatManagerProvider } from './features/chat/chatManagerContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ModelManagerProvider>
      <ChatManagerProvider>
        <App />
      </ChatManagerProvider>
    </ModelManagerProvider>
  </StrictMode>
)
