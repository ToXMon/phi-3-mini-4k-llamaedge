import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App'
import { ModelManagerProvider } from './features/models/modelManagerContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ModelManagerProvider>
      <App />
    </ModelManagerProvider>
  </StrictMode>
)
