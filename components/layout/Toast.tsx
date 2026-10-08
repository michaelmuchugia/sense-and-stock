'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

interface ToastContextValue {
  showToast: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (ctx) return ctx
  return { showToast: () => {} }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)

  const showToast = useCallback((m: string) => {
    setMessage(m)
    setVisible(true)
  }, [])

  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => setVisible(false), 2400)
    return () => clearTimeout(t)
  }, [visible, message])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className={'toast' + (visible ? ' show' : '')}>{message}</div>
    </ToastContext.Provider>
  )
}
