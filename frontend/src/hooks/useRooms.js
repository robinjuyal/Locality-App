import { useState, useEffect, useCallback } from 'react'
import { getRooms, openDirectRoom } from '../api/services'

export function useRooms() {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchRooms = useCallback(async () => {
    try {
      const data = await getRooms()
      setRooms(data || [])
    } catch (e) {
      console.error('Failed to fetch rooms', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRooms() }, [fetchRooms])

  const startDirectChat = async (targetUserId) => {
    const room = await openDirectRoom(targetUserId)
    setRooms(prev => {
      const exists = prev.find(r => r.id === room.id)
      return exists ? prev : [room, ...prev]
    })
    return room
  }

  const updateRoomLastMessage = (roomId, message) => {
    setRooms(prev => prev.map(r =>
      r.id === roomId ? { ...r, lastMessage: message } : r
    ))
  }

  return { rooms, loading, fetchRooms, startDirectChat, updateRoomLastMessage }
}
