import { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './Button.module.css'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: ReactNode
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  disabled,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        styles.btn,
        styles[variant],
        styles[size],
        loading ? styles.loading : '',
        className ?? '',
      ].join(' ')}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className={styles.spinner} aria-hidden="true" />
      )}
      <span className={styles.content}>{children}</span>
    </button>
  )
}
