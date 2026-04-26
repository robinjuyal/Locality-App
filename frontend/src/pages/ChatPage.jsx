import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWs } from '../context/WsContext'
import { useRooms } from '../hooks/useRooms'
import { getMessages, markRead, uploadMedia } from '../api/services'
import { formatDistanceToNow, format } from 'date-fns'
import toast from 'react-hot-toast'

export default function ChatPage() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { subscribe, publish, connected } = useWs()
  const { rooms, loading: roomsLoading, updateRoomLastMessage } = useRooms()

  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [typing, setTyping] = useState(null)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const messagesEndRef = useRef(null)
  const typingTimerRef = useRef(null)
  const fileInputRef = useRef(null)

  const activeRoom = rooms.find(r => r.id === Number(roomId))

  // Load messages when room changes
  useEffect(() => {
    if (!roomId) return
    setLoadingMsgs(true)
    setMessages([])
    getMessages(roomId)
      .then(data => setMessages(data || []))
      .catch(() => toast.error('Failed to load messages'))
      .finally(() => setLoadingMsgs(false))
    markRead(roomId).catch(() => {})
  }, [roomId])

  // Subscribe to room WebSocket topic
  useEffect(() => {
    if (!roomId || !connected) return
    const unsub = subscribe(`/topic/room.${roomId}`, (msg) => {
      setMessages(prev => [...prev, msg])
      updateRoomLastMessage(Number(roomId), msg)
    })
    const unsubTyping = subscribe(`/topic/room.${roomId}.typing`, (ev) => {
      if (ev.userId === user.id) return
      setTyping(ev.typing ? ev.userName : null)
    })
    return () => { unsub(); unsubTyping() }
  }, [roomId, connected])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!text.trim() || !roomId || sending) return
    setSending(true)
    publish('/app/chat.send', {
      roomId: Number(roomId),
      content: text.trim(),
      messageType: 'TEXT'
    })
    setText('')
    setSending(false)
  }

  const handleTyping = (e) => {
    setText(e.target.value)
    if (!roomId) return
    publish('/app/chat.typing', { roomId: Number(roomId), typing: true })
    clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      publish('/app/chat.typing', { roomId: Number(roomId), typing: false })
    }, 2000)
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file || !roomId) return
    setUploading(true)
    try {
      const url = await uploadMedia(file)
      const type = file.type.startsWith('image/') ? 'IMAGE' : 'TEXT'
      publish('/app/chat.send', {
        roomId: Number(roomId),
        content: file.name,
        mediaUrl: url,
        messageType: type
      })
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const isMine = (msg) => msg.sender?.id === user?.id

  return (
    <div className="flex h-full overflow-hidden pb-14 md:pb-0">
      {/* Room list */}
      <div className={`${roomId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-72 border-r border-gray-200 bg-white`}>
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-lg">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {roomsLoading ? (
            <div className="p-4 text-center text-gray-400 text-sm">Loading...</div>
          ) : rooms.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">
              No chats yet. Go to People to start a conversation.
            </div>
          ) : (
            rooms.map(room => (
              <RoomItem key={room.id} room={room} active={room.id === Number(roomId)}
                onClick={() => navigate(`/chat/${room.id}`)} />
            ))
          )}
        </div>
      </div>

      {/* Message panel */}
      {roomId ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
            <button onClick={() => navigate('/chat')} className="md:hidden text-gray-500">←</button>
            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-600">
              {activeRoom?.displayName?.[0] || '?'}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{activeRoom?.displayName || 'Loading...'}</p>
              {typing && <p className="text-xs text-primary-500 animate-pulse">{typing} is typing...</p>}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loadingMsgs && <div className="text-center text-gray-400 text-sm">Loading messages...</div>}
            {messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} mine={isMine(msg)} />
            ))}
            {typing && (
              <div className="flex gap-2">
                <div className="bg-gray-100 rounded-2xl px-4 py-2 text-sm text-gray-500 italic">
                  {typing} is typing...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="flex items-center gap-2 p-3 border-t border-gray-200 bg-white">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="text-gray-400 hover:text-primary-600 transition-colors p-1" disabled={uploading}>
              {uploading ? '⏳' : '📎'}
            </button>
            <input
              className="input flex-1"
              placeholder="Type a message..."
              value={text}
              onChange={handleTyping}
              disabled={sending}
            />
            <button type="submit" className="btn-primary px-4" disabled={!text.trim() || sending}>
              Send
            </button>
          </form>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-gray-400 flex-col gap-3">
          <span className="text-5xl">💬</span>
          <p className="text-lg font-medium">Select a conversation</p>
          <p className="text-sm">or go to People to start a new one</p>
        </div>
      )}
    </div>
  )
}

function RoomItem({ room, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50
      ${active ? 'bg-primary-50 border-l-2 border-l-primary-500' : ''}`}>
      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-600 shrink-0">
        {room.type === 'BROADCAST' ? '📢' : room.displayName?.[0] || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
          <p className="text-sm font-medium text-gray-900 truncate">{room.displayName}</p>
          {room.lastMessage && (
            <span className="text-xs text-gray-400 shrink-0 ml-1">
              {formatDistanceToNow(new Date(room.lastMessage.createdAt), { addSuffix: false })}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate">
          {room.lastMessage ? (room.lastMessage.messageType === 'IMAGE' ? '📷 Photo' : room.lastMessage.content) : 'No messages yet'}
        </p>
      </div>
      {room.unreadCount > 0 && (
        <span className="w-5 h-5 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center shrink-0">
          {room.unreadCount}
        </span>
      )}
    </button>
  )
}

function MessageBubble({ msg, mine }) {
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'} gap-2`}>
      {!mine && (
        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0 mt-1">
          {msg.sender?.name?.[0]}
        </div>
      )}
      <div className={`max-w-[70%] ${mine ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
        {!mine && <p className="text-xs text-gray-500 px-1">{msg.sender?.name}</p>}
        <div className={`rounded-2xl px-4 py-2 text-sm ${mine ? 'bg-primary-600 text-white rounded-tr-sm' : 'bg-white text-gray-900 border border-gray-100 rounded-tl-sm shadow-sm'}`}>
          {msg.messageType === 'IMAGE' ? (
            <img src={msg.mediaUrl} alt="sent image" className="rounded-lg max-w-full max-h-48 object-cover" />
          ) : (
            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
          )}
        </div>
        <p className="text-xs text-gray-400 px-1">
          {msg.createdAt ? format(new Date(msg.createdAt), 'HH:mm') : ''}
        </p>
      </div>
    </div>
  )
}
