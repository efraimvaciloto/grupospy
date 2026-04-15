'use client'
import { useEffect, useRef, useCallback } from 'react'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'

export function useRealtime(tenantId, handlers = {}) {
  const ws      = useRef(null)
  const hRef    = useRef(handlers)
  hRef.current  = handlers

  const connect = useCallback(() => {
    if (!tenantId) return
    const socket = new WebSocket(`${WS_URL}/realtime?tenantId=${tenantId}`)

    socket.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data)
        const handler = hRef.current[event.type]
        if (handler) handler(event)
      } catch {}
    }

    socket.onclose = () => {
      // Reconectar após 3s
      setTimeout(connect, 3000)
    }

    ws.current = socket
  }, [tenantId])

  useEffect(() => {
    connect()
    return () => ws.current?.close()
  }, [connect])
}
