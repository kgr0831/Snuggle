'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useAIChat } from '@/hooks/useAIChat'

interface AIChatPanelProps {
  activeSection: string
  currentCode: string
  onInsertCode: (code: string) => void
  isOpen: boolean
  onToggle: () => void
  /** inline 모드: 레이아웃 내에 통합, false면 floating 모드 */
  inline?: boolean
}

function extractCodeBlocks(
  content: string
): Array<{ language: string; code: string; index: number }> {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
  const blocks: Array<{ language: string; code: string; index: number }> = []
  let match

  while ((match = codeBlockRegex.exec(content)) !== null) {
    blocks.push({
      language: match[1] || 'text',
      code: match[2].trim(),
      index: match.index,
    })
  }

  return blocks
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export default function AIChatPanel({
  activeSection,
  currentCode,
  onInsertCode,
  isOpen,
  onToggle,
  inline = false,
}: AIChatPanelProps) {
  const [input, setInput] = useState('')
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { messages, isStreaming, streamingContent, sendMessage, stopStreaming, clearChat } =
    useAIChat({ activeSection, currentCode })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  useEffect(() => {
    if (copiedIndex !== null) {
      const timer = setTimeout(() => setCopiedIndex(null), 2000)
      return () => clearTimeout(timer)
    }
  }, [copiedIndex])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isStreaming) return

    sendMessage(input)
    setInput('')
  }

  const handleCopy = async (code: string, index: number) => {
    const success = await copyToClipboard(code)
    if (success) {
      setCopiedIndex(index)
    }
  }

  const handleInsert = (code: string) => {
    onInsertCode(code)
  }

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt)
    inputRef.current?.focus()
  }

  const renderContent = useCallback(
    (content: string, messageIndex: number) => {
      const codeBlocks = extractCodeBlocks(content)

      if (codeBlocks.length === 0) {
        return <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
      }

      const parts: Array<
        { type: 'text'; content: string } | { type: 'code'; content: string; language: string }
      > = []
      let lastIndex = 0
      const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
      let match

      while ((match = codeBlockRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
          const textContent = content.substring(lastIndex, match.index).trim()
          if (textContent) {
            parts.push({ type: 'text', content: textContent })
          }
        }

        parts.push({
          type: 'code',
          content: match[2].trim(),
          language: match[1] || 'text',
        })

        lastIndex = match.index + match[0].length
      }

      if (lastIndex < content.length) {
        const remainingText = content.substring(lastIndex).trim()
        if (remainingText) {
          parts.push({ type: 'text', content: remainingText })
        }
      }

      let codeBlockCounter = 0

      return (
        <div className="space-y-3">
          {parts.map((part, partIndex) => {
            if (part.type === 'text') {
              return (
                <p key={partIndex} className="whitespace-pre-wrap text-sm leading-relaxed">
                  {part.content}
                </p>
              )
            }

            const blockIndex = messageIndex * 1000 + codeBlockCounter++

            return (
              <div
                key={partIndex}
                className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800"
              >
                <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-100 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900">
                  <span className="text-xs font-medium uppercase text-neutral-500 dark:text-neutral-400">
                    {part.language}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopy(part.content, blockIndex)}
                      className="rounded px-2 py-1 text-xs text-neutral-600 transition-colors hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-700"
                    >
                      {copiedIndex === blockIndex ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={() => handleInsert(part.content)}
                      className="rounded bg-blue-500 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-600"
                    >
                      Insert
                    </button>
                  </div>
                </div>
                <pre className="max-h-64 overflow-auto p-3">
                  <code className="text-xs leading-relaxed text-neutral-800 dark:text-neutral-200">
                    {part.content}
                  </code>
                </pre>
              </div>
            )
          })}
        </div>
      )
    },
    [copiedIndex]
  )

  const formatSectionName = (section: string) => {
    return section
      .replace('html_', '')
      .replace('custom_', '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase())
  }

  // inline 모드에서 닫힌 상태: 아무것도 렌더링하지 않음 (부모가 토글 버튼 관리)
  if (!isOpen && inline) {
    return null
  }

  // floating 모드에서 닫힌 상태: FAB 버튼
  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
        title="AI Assistant"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      </button>
    )
  }

  // inline 모드와 floating 모드의 컨테이너 스타일
  const containerClass = inline
    ? "flex h-full w-full flex-col overflow-hidden border-l border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900"
    : "fixed bottom-6 right-6 z-50 flex h-[600px] w-[420px] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"

  return (
    <div className={containerClass}>
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">AI Code Assistant</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Editing: {formatSectionName(activeSection)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button onClick={clearChat} className="rounded-lg px-2 py-1 text-xs text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white" title="Clear">
              Clear
            </button>
          )}
          <button onClick={onToggle} className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white" title="Close">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && !streamingContent && (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30">
              <svg className="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h4 className="mb-2 text-sm font-semibold text-neutral-900 dark:text-white">AI Code Assistant</h4>
            <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">Generate HTML/CSS code for your blog template</p>
            <div className="w-full space-y-2">
              <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300">Try asking:</p>
              <button onClick={() => handleQuickPrompt('Create a modern card-based post list')} className="w-full rounded-lg bg-neutral-100 px-3 py-2.5 text-left text-xs text-neutral-700 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700">
                Create a modern card-based post list
              </button>
              <button onClick={() => handleQuickPrompt('Add a gradient header with glassmorphism')} className="w-full rounded-lg bg-neutral-100 px-3 py-2.5 text-left text-xs text-neutral-700 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700">
                Add a gradient header with glassmorphism
              </button>
              <button onClick={() => handleQuickPrompt('Create a responsive sidebar layout')} className="w-full rounded-lg bg-neutral-100 px-3 py-2.5 text-left text-xs text-neutral-700 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700">
                Create a responsive sidebar layout
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((message, index) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] rounded-2xl px-4 py-3 ${message.role === 'user' ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white'}`}>
                {message.role === 'user' ? (
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                ) : (
                  renderContent(message.content, index)
                )}
              </div>
            </div>
          ))}

          {isStreaming && streamingContent && (
            <div className="flex justify-start">
              <div className="max-w-[90%] rounded-2xl bg-neutral-100 px-4 py-3 text-neutral-900 dark:bg-neutral-800 dark:text-white">
                {renderContent(streamingContent, messages.length)}
                <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-blue-500" />
              </div>
            </div>
          )}

          {isStreaming && !streamingContent && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-2xl bg-neutral-100 px-4 py-3 dark:bg-neutral-800">
                <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.3s]" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.15s]" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-400" />
              </div>
            </div>
          )}
        </div>

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="shrink-0 border-t border-neutral-200 p-4 dark:border-neutral-800">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI to generate code..."
            disabled={isStreaming}
            className="flex-1 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-neutral-400 focus:border-blue-500 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:border-blue-400"
          />
          {isStreaming ? (
            <button type="button" onClick={stopStreaming} className="shrink-0 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600">
              Stop
            </button>
          ) : (
            <button type="submit" disabled={!input.trim()} className="shrink-0 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50">
              Send
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
