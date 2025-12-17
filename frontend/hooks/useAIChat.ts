'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { streamAIChat, ChatMessage } from '@/lib/api/ollama'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface UseAIChatOptions {
  activeSection: string
  currentCode: string
}

export function useAIChat({ activeSection, currentCode }: UseAIChatOptions) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const abortRef = useRef<(() => void) | null>(null)
  const streamingContentRef = useRef('')

  // Update ref when streamingContent changes
  useEffect(() => {
    streamingContentRef.current = streamingContent
  }, [streamingContent])

  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim() || isStreaming) return

      // Add user message
      const newUserMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: userMessage.trim(),
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, newUserMessage])
      setIsStreaming(true)
      setStreamingContent('')
      streamingContentRef.current = ''

      // Prepare chat history (last 10 messages for context)
      const chatHistory: ChatMessage[] = [
        ...messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: userMessage.trim() },
      ]

      // Start streaming
      const abort = await streamAIChat(
        chatHistory,
        activeSection,
        currentCode,
        // onChunk
        (chunk: string) => {
          setStreamingContent((prev) => {
            const newContent = prev + chunk
            streamingContentRef.current = newContent
            return newContent
          })
        },
        // onError
        (error: string) => {
          console.error('AI streaming error:', error)
          setIsStreaming(false)

          // Add error message
          const errorMessage: Message = {
            id: `assistant-error-${Date.now()}`,
            role: 'assistant',
            content: `죄송합니다. 오류가 발생했습니다: ${error}`,
            timestamp: Date.now(),
          }
          setMessages((prev) => [...prev, errorMessage])
          setStreamingContent('')
        },
        // onDone
        () => {
          setIsStreaming(false)

          // Add completed assistant message using ref for latest content
          const finalContent = streamingContentRef.current
          if (finalContent) {
            const assistantMessage: Message = {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: finalContent,
              timestamp: Date.now(),
            }
            setMessages((prev) => [...prev, assistantMessage])
          }
          setStreamingContent('')
        }
      )

      abortRef.current = abort
    },
    [messages, activeSection, currentCode, isStreaming]
  )

  const stopStreaming = useCallback(() => {
    if (abortRef.current) {
      abortRef.current()
      abortRef.current = null
    }

    // Save partial response if any
    const partialContent = streamingContentRef.current
    if (partialContent) {
      const partialMessage: Message = {
        id: `assistant-partial-${Date.now()}`,
        role: 'assistant',
        content: partialContent + '\n\n*(응답이 중단되었습니다)*',
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, partialMessage])
    }

    setIsStreaming(false)
    setStreamingContent('')
  }, [])

  const clearChat = useCallback(() => {
    // Stop any ongoing stream
    if (abortRef.current) {
      abortRef.current()
      abortRef.current = null
    }

    setMessages([])
    setStreamingContent('')
    setIsStreaming(false)
  }, [])

  return {
    messages,
    isStreaming,
    streamingContent,
    sendMessage,
    stopStreaming,
    clearChat,
  }
}
