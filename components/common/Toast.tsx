'use client'

import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'error'
  isVisible: boolean
  onClose: () => void
}

export default function Toast({ message, type = 'success', isVisible, onClose }: ToastProps) {
  const [items, setItems] = useState<{ id: number; message: string; type: 'success' | 'error'; leaving: boolean }[]>([])

  useEffect(() => {
    if (isVisible && message) {
      const id = Date.now()
      setItems(prev => [...prev, { id, message, type, leaving: false }])

      // 2.5초 후 leaving 상태로
      setTimeout(() => {
        setItems(prev => prev.map(item =>
          item.id === id ? { ...item, leaving: true } : item
        ))
      }, 2500)

      // 3초 후 제거
      setTimeout(() => {
        setItems(prev => prev.filter(item => item.id !== id))
        onClose()
      }, 2800)
    }
  }, [isVisible, message])

  if (items.length === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2">
      {items.map(item => (
        <div
          key={item.id}
          className={`flex items-center gap-2 rounded-full px-5 py-3 shadow-lg ${
            item.type === 'success'
              ? 'bg-black text-white dark:bg-white dark:text-black'
              : 'bg-red-500 text-white'
          }`}
          style={{
            animation: item.leaving
              ? 'toastOut 0.3s ease-out forwards'
              : 'toastIn 0.3s ease-out forwards'
          }}
        >
          {item.type === 'success' ? (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <span className="text-sm font-medium">{item.message}</span>
        </div>
      ))}
    </div>
  )
}
