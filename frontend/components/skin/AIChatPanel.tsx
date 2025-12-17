'use client'

import { useState, useRef, useEffect } from 'react'
import type { CustomSkinUpdateData } from '@/lib/api/skins'

interface AIChatPanelProps {
  onApplyDesign: (sections: Record<string, string>) => void
  isOpen: boolean
  onToggle: () => void
  currentSections?: CustomSkinUpdateData
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

// ==========================================
// 🎨 MASCOT POSITION CONFIGURATION (마스코트 위치 설정)
// 아래 값들을 수정하여 마스코트의 위치와 동작을 조정하세요.
// ==========================================
const MASCOT_CONFIG = {
  // 1. 전체 컨테이너 위치 (화면 기준)
  // 예: bottom-0 left-0 (완전 구석), left-[-40px] (왼쪽으로 숨김)
  containerPosition: "bottom-0 left-[-180px]",

  // 2. 마스코트 숨기기 정도 (Y축 이동)
  // 값이 클수록 아래로 많이 내려갑니다. (100% = 완전히 숨김, 0% = 전체 다 보임)

  // (1) 평소 상태 (빼꼼)
  idleY: "translate-y-[30%]",

  // (2) 마우스 올렸을 때 (조금 더 올라옴)
  hoverY: "hover:translate-y-[20%] hover:translate-x-[60%]",

  // (3) 클릭해서 채팅 열렸을 때 (완전히 보임)
  openY: "translate-y-1 translate-x-40",

  chatPosition: "bottom-[70%] left-[130%]",
}

export default function AIChatPanel({
  onApplyDesign,
  isOpen,
  onToggle,
  currentSections = {},
}: AIChatPanelProps) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // 초기 웰컴 메시지 설정
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: '안녕하세요! 디자인을 도와드릴까요?',
          timestamp: Date.now(),
        },
      ])
    }
  }, []) // Empty dependency array means run once on mount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    }

    setMessages(prev => [...prev, userMessage])
    const userInput = input.trim()
    setInput('')
    setIsLoading(true)

    try {
      // Get auth token
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        throw new Error('로그인이 필요합니다')
      }

      // Filter out boolean properties, only send string sections
      const stringSections: Record<string, string> = {}
      if (currentSections) {
        for (const [key, value] of Object.entries(currentSections)) {
          if (typeof value === 'string') {
            stringSections[key] = value
          }
        }
      }

      console.log('[AI] Sending request...')
      console.log('[AI] User input:', userInput)
      console.log('[AI] Current sections:', stringSections)
      console.log('[AI] Current code length:', JSON.stringify(stringSections).length)

      // Use streaming endpoint
      const response = await fetch(`${API_URL}/api/ollama/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userInput }],
          currentCode: JSON.stringify(stringSections),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'AI 응답을 받지 못했습니다')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('응답을 읽을 수 없습니다')

      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })

        const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'))

        for (const line of lines) {
          const data = line.replace(/^data:\s*/, '')
          if (!data) continue

          try {
            const event = JSON.parse(data)

            if (event.type === 'chunk' && event.content) {
              fullContent = event.content // Replace content
            } else if (event.type === 'error') {
              throw new Error(event.error || 'AI 처리 중 오류 발생')
            }
          } catch (parseError) {
            console.log('[AI] Failed to parse event:', data)
          }
        }
      }

      if (!fullContent) {
        throw new Error('AI 응답이 비어있습니다')
      }

      // Parse JSON response from AI
      let parsed
      try {
        parsed = JSON.parse(fullContent)
      } catch {
        const jsonMatch = fullContent.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('JSON 파싱 실패')
        }
      }

      if (parsed.sections) {
        console.log(`[AI] Applying sections`)
        onApplyDesign(parsed.sections)

        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: parsed.message || '디자인을 적용했어요! ✨',
          timestamp: Date.now(),
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        throw new Error('AI 응답에 sections가 없습니다')
      }
    } catch (error) {
      console.error('[AI] Error:', error)
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: error instanceof Error ? error.message : '오류가 발생했어요. 다시 시도해주세요.',
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Animation States
  const [renderBubble, setRenderBubble] = useState(isOpen)
  const [isExiting, setIsExiting] = useState(false)
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0)

  const LOADING_MESSAGES = [
    "스누글이 디자인을 생각하고 있습니다...",
    "스누글이 고민하고 있습니다...",
    "스누글이 당신의 미적 감각에 감탄하고 있습니다...",
    "스누글이 집중하고 있습니다...",
    "스누글이 디자인 하고 있습니다..."
  ]

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isLoading) {
      setLoadingMsgIndex(0)
      interval = setInterval(() => {
        setLoadingMsgIndex(prev => (prev + 1) % LOADING_MESSAGES.length)
      }, 5000)
    }
    return () => clearInterval(interval)
  }, [isLoading])

  useEffect(() => {
    if (isOpen) {
      setRenderBubble(true)
      setIsExiting(false)
    } else {
      setIsExiting(true)
      const timer = setTimeout(() => setRenderBubble(false), 400) // Match animation duration
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt)
    inputRef.current?.focus()
  }

  return (
    <>
      <style>{`
        @keyframes pop-in-rotate {
          0% {
            transform: scale(0) rotate(-10deg) translate(-20px, 20px);
            opacity: 0;
          }
          60% {
            transform: scale(1.1) rotate(2deg);
          }
          100% {
            transform: scale(1) rotate(0);
            opacity: 1;
          }
        }
        @keyframes pop-out-rotate {
          0% {
            transform: scale(1) rotate(0);
            opacity: 1;
          }
          100% {
            transform: scale(0) rotate(-10deg) translate(-20px, 20px);
            opacity: 0;
          }
        }
        @keyframes aurora-glow {
          0% {
            box-shadow: inset 0 0 50px 10px rgba(120, 0, 255, 0.3),
                        inset 0 0 100px 20px rgba(0, 200, 255, 0.2);
          }
          50% {
            box-shadow: inset 0 0 80px 30px rgba(0, 255, 150, 0.3),
                        inset 0 0 140px 40px rgba(180, 0, 255, 0.2);
          }
          100% {
            box-shadow: inset 0 0 50px 10px rgba(120, 0, 255, 0.3),
                        inset 0 0 100px 20px rgba(0, 200, 255, 0.2);
          }
        }
        .animate-pop-in {
          animation: pop-in-rotate 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          transform-origin: bottom left;
        }
        .animate-pop-out {
          animation: pop-out-rotate 0.4s ease-in forwards;
          transform-origin: bottom left;
        }
      `}</style>

      {/* Global Aurora Overlay */}
      <div
        className={`pointer-events-none fixed inset-0 z-[9999] transition-opacity duration-1000 ease-in-out ${isLoading ? 'opacity-100' : 'opacity-0'}`}
        style={{
          animation: 'aurora-glow 4s ease-in-out infinite alternate',
          background: 'radial-gradient(circle at center, transparent 30%, rgba(255,255,255,0.05) 100%)'
        }}
      />

      <div className={`fixed z-50 flex flex-col items-start gap-2 ${MASCOT_CONFIG.containerPosition}`}>
        {/* Speech Bubble Chat Panel */}
        {renderBubble && (
          <div className={`absolute mb-4 w-[320px] ${isExiting ? 'animate-pop-out' : 'animate-pop-in'} ${MASCOT_CONFIG.chatPosition}`}>
            <div className="relative flex max-h-[500px] flex-col overflow-hidden rounded-[2rem] border border-white/20 bg-white/90 shadow-2xl backdrop-blur-xl dark:border-neutral-700/50 dark:bg-neutral-900/90">

              {/* Speech Bubble Arrow */}
              <div className="absolute -bottom-2 left-10 h-6 w-6 rotate-45 border-b border-r border-white/20 bg-white/90 backdrop-blur-xl dark:border-neutral-700/50 dark:bg-neutral-900/90"></div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 scrollbar-hide" style={{ maxHeight: '400px' }}>
                <div className="space-y-3">
                  {messages.map((message, index) => {
                    const isUser = message.role === 'user';
                    // Check if next message is same role for stacking effect (optional polish)
                    const isLast = index === messages.length - 1;

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] px-4 py-2.5 text-[15px] leading-relaxed tracking-wide shadow-sm
                            ${isUser
                              ? 'bg-[#007AFF] text-white rounded-[1.2rem] rounded-br-sm'
                              : 'bg-[#E5E5EA] text-black dark:bg-[#262626] dark:text-white rounded-[1.2rem] rounded-bl-sm'
                            }
                          `}
                        >
                          {message.content}
                        </div>
                      </div>
                    )
                  })}
                  {isLoading && (
                    <div className="flex justify-start animate-pulse">
                      <div className="flex items-center gap-2 rounded-[1.2rem] rounded-bl-sm bg-[#E5E5EA] px-4 py-3.5 dark:bg-[#262626]">
                        <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                          {LOADING_MESSAGES[loadingMsgIndex]}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="bg-transparent p-4">
                <form onSubmit={handleSubmit} className="relative flex items-center">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="디자인을 요청해보세요..."
                    disabled={isLoading}
                    className="w-full rounded-full border border-neutral-200 bg-neutral-50 py-3 pl-4 pr-12 text-sm outline-none transition-all focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-100 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:border-violet-500 dark:focus:ring-violet-900/30"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-white transition-all hover:bg-violet-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-700"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Mascot Image Trigger */}
        <button
          onClick={onToggle}
          className="group relative cursor-pointer outline-none transition-transform active:scale-95"
        >
          <div className={`
            relative w-64 transition-transform duration-500 ease-spring
            ${isOpen ? MASCOT_CONFIG.openY : `${MASCOT_CONFIG.idleY} ${MASCOT_CONFIG.hoverY}`}
          `}>
            <img
              src="/image/snuggle_ai_start.png"
              alt="AI Designer"
              className="w-full drop-shadow-2xl filter transition-all duration-300 hover:brightness-105"
            />


          </div>
        </button>
      </div>
    </>
  )
}

