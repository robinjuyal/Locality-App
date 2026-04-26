import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { useAuth } from './AuthContext'

const WsContext = createContext(null)

export function WsProvider({ children }) {
  const { token } = useAuth()
  const clientRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const subscriptions = useRef({})

  useEffect(() => {
    if (!token) return

    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 3000,
      onConnect: () => {
        setConnected(true)
        // Re-subscribe after reconnect
        Object.entries(subscriptions.current).forEach(([dest, cb]) => {
          client.subscribe(dest, msg => cb(JSON.parse(msg.body)))
        })
      },
      onDisconnect: () => setConnected(false),
      onStompError: frame => console.error('STOMP error', frame)
    })

    client.activate()
    clientRef.current = client

    return () => {
      client.deactivate()
      setConnected(false)
    }
  }, [token])

  const subscribe = (destination, callback) => {
    subscriptions.current[destination] = callback
    if (clientRef.current?.connected) {
      const sub = clientRef.current.subscribe(destination, msg => callback(JSON.parse(msg.body)))
      return () => {
        sub.unsubscribe()
        delete subscriptions.current[destination]
      }
    }
    return () => { delete subscriptions.current[destination] }
  }

  const publish = (destination, body) => {
    if (clientRef.current?.connected) {
      clientRef.current.publish({ destination, body: JSON.stringify(body) })
    }
  }

  return (
    <WsContext.Provider value={{ connected, subscribe, publish }}>
      {children}
    </WsContext.Provider>
  )
}

export const useWs = () => useContext(WsContext)
