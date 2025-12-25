/**
 * SSE Streaming Utility for Real-Time Activity Logs
 *
 * Creates a ReadableStream that sends Server-Sent Events (SSE) format data
 * for real-time log updates in the data management page.
 */

export interface StreamLogEntry {
  type: 'info' | 'success' | 'error' | 'warning' | 'progress'
  message: string
  details?: {
    endpoint?: string
    recordId?: string
    recordName?: string
    progress?: { current: number; total: number }
    duration?: number
    error?: string
  }
}

export interface StreamSummary {
  success: boolean
  imported: number
  errors: number
  total: number
  duration: number
  done: true
}

export function createSSEStream() {
  const encoder = new TextEncoder()
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c
    },
    cancel() {
      controller = null
    }
  })

  const sendLog = (log: StreamLogEntry) => {
    if (controller) {
      const data = `data: ${JSON.stringify(log)}\n\n`
      controller.enqueue(encoder.encode(data))
    }
  }

  const close = (summary: Omit<StreamSummary, 'done'>) => {
    if (controller) {
      const finalData = `data: ${JSON.stringify({ ...summary, done: true })}\n\n`
      controller.enqueue(encoder.encode(finalData))
      controller.close()
    }
  }

  const closeWithError = (error: string, duration: number) => {
    if (controller) {
      const errorData = `data: ${JSON.stringify({
        success: false,
        error,
        duration,
        done: true
      })}\n\n`
      controller.enqueue(encoder.encode(errorData))
      controller.close()
    }
  }

  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  }

  return { stream, sendLog, close, closeWithError, headers }
}

/**
 * Check if the request wants streaming response
 */
export function wantsStreaming(request: Request): boolean {
  const url = new URL(request.url)
  return url.searchParams.get('stream') === 'true'
}
