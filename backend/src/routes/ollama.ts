import { Router, Response } from 'express'
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js'
import {
  streamChatCompletion,
  buildSystemPrompt,
  checkOllamaHealth,
  OllamaMessage,
} from '../services/ollama.service.js'
import { logger } from '../utils/logger.js'

const router = Router()

/**
 * SSE streaming endpoint for AI chat
 * POST /api/ollama/chat/stream
 */
router.post(
  '/chat/stream',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { messages, activeSection, currentCode } = req.body

      // Validate request
      if (!messages || !Array.isArray(messages)) {
        res.status(400).json({ error: 'Messages array is required' })
        return
      }

      if (!activeSection) {
        res.status(400).json({ error: 'Active section is required' })
        return
      }

      // Build system prompt with context
      const systemPrompt = buildSystemPrompt(activeSection, currentCode || '')

      // Prepare messages with system prompt
      const chatMessages: OllamaMessage[] = [
        { role: 'system', content: systemPrompt },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ]

      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.setHeader('X-Accel-Buffering', 'no') // Disable nginx buffering
      res.flushHeaders()

      // Send initial connection event
      res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)

      let isComplete = false

      // Stream chat completion
      await streamChatCompletion(
        chatMessages,
        // onChunk
        (chunk: string) => {
          if (!isComplete && !res.writableEnded) {
            res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`)
          }
        },
        // onError
        (error: Error) => {
          if (!isComplete && !res.writableEnded) {
            logger.error('Stream error:', error)
            res.write(
              `data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`
            )
            res.end()
            isComplete = true
          }
        },
        // onDone
        () => {
          if (!isComplete && !res.writableEnded) {
            res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
            res.end()
            isComplete = true
          }
        }
      )

      // Handle client disconnect
      req.on('close', () => {
        if (!isComplete) {
          logger.info('Client disconnected from AI stream')
          isComplete = true
        }
      })
    } catch (error) {
      logger.error('AI chat error:', error)

      // If headers not sent yet, send JSON error
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to process AI request' })
      } else if (!res.writableEnded) {
        // If streaming already started, send error event
        res.write(
          `data: ${JSON.stringify({ type: 'error', error: 'Internal server error' })}\n\n`
        )
        res.end()
      }
    }
  }
)

/**
 * Health check endpoint
 * GET /api/ollama/health
 */
router.get(
  '/health',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const health = await checkOllamaHealth()

      res.json({
        status: health.available ? 'ok' : 'unavailable',
        model: health.model,
        modelLoaded: health.modelLoaded,
      })
    } catch (error) {
      logger.error('Health check error:', error)
      res.status(500).json({ error: 'Health check failed' })
    }
  }
)

export default router
