import { createClient } from '@/lib/supabase/client'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

async function getAuthToken(): Promise<string | null> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token || null
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface StreamEvent {
  type: 'connected' | 'chunk' | 'done' | 'error'
  content?: string
  error?: string
}

export interface AIHealthStatus {
  status: 'ok' | 'unavailable'
  model: string
  modelLoaded: boolean
}

/**
 * Stream AI chat responses using Server-Sent Events
 * @returns Abort function to cancel the stream
 */
export async function streamAIChat(
  messages: ChatMessage[],
  activeSection: string,
  currentCode: string,
  onChunk: (content: string) => void,
  onError: (error: string) => void,
  onDone: () => void
): Promise<() => void> {
  const token = await getAuthToken()

  if (!token) {
    onError('로그인이 필요합니다')
    return () => {}
  }

  const controller = new AbortController()

  fetch(`${API_URL}/api/ollama/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messages,
      activeSection,
      currentCode,
    }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          onDone()
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter((line) => line.trim().startsWith('data:'))

        for (const line of lines) {
          const data = line.replace(/^data:\s*/, '')
          try {
            const event: StreamEvent = JSON.parse(data)

            switch (event.type) {
              case 'chunk':
                if (event.content) {
                  onChunk(event.content)
                }
                break
              case 'done':
                onDone()
                return
              case 'error':
                onError(event.error || '알 수 없는 오류가 발생했습니다')
                return
              case 'connected':
                // Connection established, continue
                break
            }
          } catch {
            // Skip invalid JSON
            continue
          }
        }
      }
    })
    .catch((error) => {
      if (error.name !== 'AbortError') {
        onError(error.message || 'AI 서비스 연결에 실패했습니다')
      }
    })

  // Return abort function
  return () => controller.abort()
}

/**
 * Check AI service health
 */
export async function checkAIHealth(): Promise<AIHealthStatus | null> {
  const token = await getAuthToken()

  if (!token) {
    return null
  }

  try {
    const response = await fetch(`${API_URL}/api/ollama/health`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      return null
    }

    return response.json()
  } catch (error) {
    console.error('AI health check failed:', error)
    return null
  }
}
