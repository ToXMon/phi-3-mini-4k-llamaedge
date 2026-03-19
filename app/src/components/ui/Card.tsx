import { HTMLAttributes, ReactNode } from 'react'
import styles from './Card.module.css'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  glass?: boolean
}

export default function Card({ children, glass = false, className, ...props }: CardProps) {
  return (
    <div
      className={[styles.card, glass ? styles.glass : '', className ?? ''].join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}
