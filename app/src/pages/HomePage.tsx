import { FormEvent, useMemo, useState } from 'react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import ModelDownloadCard from '../components/model/ModelDownloadCard'
import { useChatManager } from '../features/chat/chatManagerContext'
import { useModelManager } from '../features/models/modelManagerContext'
import { usePWA } from '../hooks/usePWA'
import styles from './HomePage.module.css'

const FIRST_RUN_GUIDANCE =
  'The first run can take a while because model files are downloaded and cached locally.'

function statusCopy(status: ReturnType<typeof useChatManager>['status']) {
  switch (status) {
    case 'idle':
      return 'Waiting for your first prompt'
    case 'checking-cache':
      return 'Checking local cache…'
    case 'not-downloaded':
      return 'Model not downloaded'
    case 'initializing':
      return 'Starting local inference engine…'
    case 'downloading':
      return 'Downloading model for offline use…'
    case 'verifying':
      return 'Verifying local model files…'
    case 'ready':
      return 'Ready for local chat'
    case 'generating':
      return 'Generating answer…'
    case 'error':
      return 'Needs attention'
    default:
      return status
  }
}

function getStatusBadgeClass(
  status: ReturnType<typeof useChatManager>['status'],
  classes: Record<string, string>,
) {
  if (status === 'initializing' || status === 'checking-cache' || status === 'verifying') return classes.badgeInitializing
  if (status === 'downloading') return classes.badgeDownloading
  if (status === 'not-downloaded') return classes.badgeError
  if (status === 'ready') return classes.badgeReady
  if (status === 'generating') return classes.badgeGenerating
  if (status === 'error') return classes.badgeError
  return ''
}

export default function HomePage() {
  const {
    messages,
    status,
    progressText,
    error,
    sendMessage,
    stopGeneration,
    regenerateLastAnswer,
    clearConversation,
    canRegenerate,
    canStop,
    isBusy,
  } = useChatManager()
  const { models, metadata, downloadModel, deleteCachedModel, clearDownloadError } = useModelManager()
  const { isOnline } = usePWA()
  const [input, setInput] = useState('')
  const selectedModel = models.find((model) => model.id === metadata.modelId) ?? models[0]
  const isPreparing =
    status === 'checking-cache' ||
    status === 'not-downloaded' ||
    status === 'initializing' ||
    status === 'downloading' ||
    status === 'verifying'
  const isErrorState = status === 'error'

  const messageList = useMemo(
    () => messages.filter((message) => message.content.trim().length > 0),
    [messages],
  )

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const next = input.trim()
    if (!next) return
    setInput('')
    await sendMessage(next)
  }

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <Card className={styles.statusCard}>
          <div className={styles.statusTop}>
            <h1 className={styles.title}>Phi-3 Mini Local Chat</h1>
            <span className={`${styles.badge} ${getStatusBadgeClass(status, styles)}`}>
              {statusCopy(status)}
            </span>
          </div>
          <p className={styles.subtitle}>
            Private, local-first chat powered by WebGPU + WebLLM. No backend. No cloud inference.
          </p>
          {progressText && <p className={styles.progress}>{progressText}</p>}
          {error && <p className={styles.error}>{error}</p>}
          {!isOnline && (
            <p className={styles.offlineHint}>
              Offline mode active. If model files were cached earlier, inference continues without network.
            </p>
          )}
          <p className={styles.requirements}>
            Requires a modern browser with WebGPU support and enough device memory for Phi-3 Mini 4K.
          </p>
        </Card>

        <ModelDownloadCard
          model={selectedModel}
          metadata={metadata}
          onRetry={downloadModel}
          onDelete={deleteCachedModel}
          onClearError={clearDownloadError}
        />

        <div className={styles.chatPanel}>
          <div className={styles.messages} role="log" aria-live="polite">
            {messageList.length === 0 ? (
              isPreparing ? (
                <Card className={styles.loadingState}>
                  <h2>Preparing your local model</h2>
                  <p>{progressText ?? FIRST_RUN_GUIDANCE}</p>
                </Card>
              ) : isErrorState && error ? (
                <Card className={styles.errorState}>
                  <h2>We hit a local setup problem</h2>
                  <p>{error}</p>
                  <p>Try sending your prompt again. If it persists, clear chat and refresh the page.</p>
                </Card>
              ) : (
                <Card className={styles.emptyState}>
                  <h2>Start a local conversation</h2>
                  <p>
                    Ask anything to initialize the model. {FIRST_RUN_GUIDANCE}
                  </p>
                </Card>
              )
            ) : (
              messageList.map((message) => (
                <div
                  key={message.id}
                  className={`${styles.messageRow} ${message.role === 'user' ? styles.userRow : styles.assistantRow}`}
                >
                  <div className={`${styles.messageBubble} ${message.role === 'user' ? styles.userBubble : styles.assistantBubble}`}>
                    <p>{message.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <form className={styles.composer} onSubmit={(event) => void onSubmit(event)}>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className={styles.input}
              rows={3}
              placeholder="Ask anything..."
              disabled={isBusy}
            />
            <div className={styles.actions}>
              <Button type="submit" disabled={isBusy || input.trim().length === 0}>
                Send
              </Button>
              <Button type="button" variant="secondary" onClick={stopGeneration} disabled={!canStop}>
                Stop
              </Button>
              <Button type="button" variant="secondary" onClick={regenerateLastAnswer} disabled={!canRegenerate}>
                Regenerate
              </Button>
              <Button type="button" variant="danger" onClick={clearConversation} disabled={messageList.length === 0 && status !== 'error'}>
                Clear chat
              </Button>
            </div>
            <p className={styles.composerHint}>
              {isPreparing
                ? 'Model setup in progress. You can type now and send once ready.'
                : 'Everything stays on this device, including model cache and chat history.'}
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
