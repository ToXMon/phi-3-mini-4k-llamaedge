import { FormEvent, useMemo, useState } from 'react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { useChatManager } from '../features/chat/chatManagerContext'
import styles from './HomePage.module.css'

function statusCopy(status: ReturnType<typeof useChatManager>['status']) {
  switch (status) {
    case 'idle':
      return 'Idle'
    case 'initializing':
      return 'Initializing local model engine…'
    case 'downloading':
      return 'Downloading model to browser storage…'
    case 'ready':
      return 'Ready'
    case 'generating':
      return 'Generating response…'
    case 'error':
      return 'Error'
    default:
      return status
  }
}

function getStatusBadgeClass(
  status: ReturnType<typeof useChatManager>['status'],
  classes: Record<string, string>,
) {
  if (status === 'initializing') return classes.badgeInitializing
  if (status === 'downloading') return classes.badgeDownloading
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
  const [input, setInput] = useState('')

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
            Runs fully in your browser with WebGPU + WebLLM. No backend and no cloud inference.
          </p>
          {progressText && <p className={styles.progress}>{progressText}</p>}
          {error && <p className={styles.error}>{error}</p>}
          <p className={styles.requirements}>
            Requires a modern browser with WebGPU support and enough device memory for Phi-3 Mini 4K.
          </p>
        </Card>

        <div className={styles.chatPanel}>
          <div className={styles.messages} role="log" aria-live="polite">
            {messageList.length === 0 ? (
              <Card className={styles.emptyState}>
                <h2>Start a local conversation</h2>
                <p>
                  Ask anything to initialize the model. The first run can take a while because model files are downloaded and cached locally.
                </p>
              </Card>
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
              placeholder="Type a message..."
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
                Clear
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
