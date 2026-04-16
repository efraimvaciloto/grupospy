'use client'
import { useEffect, useRef, useCallback } from 'react'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'

function getAuthToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('gs_token')
}

export function useRealtime(tenantId, handlers = {}) {
  const ws      = useRef(null)
  const hRef    = useRef(handlers)
  hRef.current  = handlers

  const connect = useCallback(() => {
    const token = getAuthToken()
    if (!token) return
    const socket = new WebSocket(`${WS_URL}/realtime?token=${token}`)

    socket.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data)
        if (event.type === 'ping') return // heartbeat do servidor
        const handler = hRef.current[event.type]
        if (handler) handler(event)
      } catch {}
    }

    socket.onclose = () => {
      // Reconectar após 3s
      setTimeout(connect, 3000)
    }

    ws.current = socket
  }, [])

  useEffect(() => {
    connect()
    return () => ws.current?.close()
  }, [connect])
}
