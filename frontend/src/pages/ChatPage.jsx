import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWs } from '../context/WsContext'
import { useRooms } from '../hooks/useRooms'
import {
  getMessages, markRead, uploadMedia, uploadVoice,
  reactToMessage, deleteMessage, pinMessage,
  getPinnedMessages, searchMessages
} from '../api/services'
import { cacheMessages, getCachedMessages, updateCachedMessage } from '../utils/db'
import { formatMessageTime, formatRoomTime, formatLastSeen, formatDateDivider, isSameDay } from '../utils/format'
import toast from 'react-hot-toast'

const REACTIONS = ['👍','❤️','😂','😮','😢','🙏']

export default function ChatPage() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { subscribe, publish, connected } = useWs()
  const { rooms, loading: roomsLoading, updateRoomLastMessage, fetchRooms } = useRooms()

  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [typing, setTyping] = useState(null)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [pinnedMsgs, setPinnedMsgs] = useState([])
  const [showPinned, setShowPinned] = useState(false)
  const [ctxMenu, setCtxMenu] = useState(null) // {msgId, x, y}
  const [showReactions, setShowReactions] = useState(null) // msgId
  const [onlineUsers, setOnlineUsers] = useState({}) // userId -> {online, lastSeen}
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [searchRoom, setSearchRoom] = useState('')

  const messagesEndRef = useRef(null)
  const typingTimerRef = useRef(null)
  const fileInputRef = useRef(null)
  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])
  const recordingTimer = useRef(null)
  const ctxMenuRef = useRef(null)

  const activeRoom = rooms.find(r => r.id === Number(roomId))
  const isMine = (msg) => msg.sender?.id === user?.id
  const otherUser = activeRoom?.otherUser
  const isOnline = otherUser ? (onlineUsers[otherUser.id]?.online ?? otherUser.online) : false
  const lastSeen = otherUser
    ? formatLastSeen(onlineUsers[otherUser.id]?.lastSeen ?? otherUser.lastSeen, isOnline)
    : null

  // Load messages
  useEffect(() => {
    if (!roomId) return
    setMessages([]); setReplyTo(null); setShowSearch(false)
    setLoadingMsgs(true)

    // Show cached first
    getCachedMessages(Number(roomId)).then(cached => {
      if (cached.length > 0) {
        setMessages(cached.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt)))
      }
    })

    getMessages(roomId).then(data => {
      const msgs = data || []
      setMessages(msgs)
      cacheMessages(Number(roomId), msgs)
    }).catch(() => toast.error('Failed to load messages'))
      .finally(() => setLoadingMsgs(false))

    markRead(roomId).catch(() => {})
    getPinnedMessages(roomId).then(setPinnedMsgs).catch(() => {})
  }, [roomId])

  // WebSocket subscriptions
  useEffect(() => {
    if (!roomId || !connected) return
    const unsubMsg = subscribe(`/topic/room.${roomId}`, (msg) => {
      setMessages(prev => {
        const exists = prev.find(m => m.id === msg.id)
        const updated = exists ? prev.map(m => m.id === msg.id ? msg : m) : [...prev, msg]
        cacheMessages(Number(roomId), updated)
        return updated
      })
      updateRoomLastMessage(Number(roomId), msg)
      if (msg.sender?.id !== user?.id) markRead(roomId).catch(() => {})
    })
    const unsubTyping = subscribe(`/topic/room.${roomId}.typing`, (ev) => {
      if (ev.userId === user.id) return
      setTyping(ev.typing ? ev.userName : null)
      if (ev.typing) {
        clearTimeout(typingTimerRef.current)
        typingTimerRef.current = setTimeout(() => setTyping(null), 3000)
      }
    })
    return () => { unsubMsg(); unsubTyping() }
  }, [roomId, connected])

  // Presence subscription
  useEffect(() => {
    if (!connected) return
    publish('/app/presence.online', {})
    const unsub = subscribe('/topic/presence', (ev) => {
      setOnlineUsers(prev => ({ ...prev, [ev.userId]: { online: ev.online, lastSeen: ev.lastSeen } }))
    })
    return () => {
      publish('/app/presence.offline', {})
      unsub()
    }
  }, [connected])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Close context menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ctxMenuRef.current && !ctxMenuRef.current.contains(e.target)) {
        setCtxMenu(null); setShowReactions(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Send text message
  const sendMessage = (e) => {
    e.preventDefault()
    if (!text.trim() || !roomId) return
    publish('/app/chat.send', {
      roomId: Number(roomId), content: text.trim(),
      messageType: 'TEXT', replyToId: replyTo?.id || null
    })
    setText(''); setReplyTo(null)
  }

  // Typing event
  const handleTyping = (e) => {
    setText(e.target.value)
    publish('/app/chat.typing', { roomId: Number(roomId), typing: true })
    clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() =>
      publish('/app/chat.typing', { roomId: Number(roomId), typing: false }), 2000)
  }

  // Image upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0]; if (!file || !roomId) return
    setUploading(true)
    try {
      const url = await uploadMedia(file)
      publish('/app/chat.send', {
        roomId: Number(roomId), content: file.name,
        mediaUrl: url, messageType: 'IMAGE', replyToId: replyTo?.id || null
      })
      setReplyTo(null)
    } catch { toast.error('Upload failed') }
    finally { setUploading(false); e.target.value = '' }
  }

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunks.current = []
      mediaRecorder.current = new MediaRecorder(stream)
      mediaRecorder.current.ondataavailable = e => audioChunks.current.push(e.data)
      mediaRecorder.current.onstop = async () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' })
        stream.getTracks().forEach(t => t.stop())
        try {
          const url = await uploadVoice(blob)
          publish('/app/chat.send', {
            roomId: Number(roomId), content: 'Voice message',
            mediaUrl: url, messageType: 'VOICE', replyToId: replyTo?.id || null
          })
          setReplyTo(null)
        } catch { toast.error('Voice upload failed') }
      }
      mediaRecorder.current.start()
      setRecording(true); setRecordingTime(0)
      recordingTimer.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
    } catch { toast.error('Microphone access denied') }
  }

  const stopRecording = () => {
    mediaRecorder.current?.stop()
    setRecording(false)
    clearInterval(recordingTimer.current)
  }

  // Reaction
  const handleReact = async (msgId, emoji) => {
    setShowReactions(null); setCtxMenu(null)
    try {
      const updated = await reactToMessage(msgId, emoji)
      setMessages(prev => prev.map(m => m.id === msgId ? updated : m))
      updateCachedMessage(updated)
      // Broadcast to room
      publish('/app/chat.send', { roomId: Number(roomId), _type: 'REACTION_UPDATE' })
    } catch {}
  }

  // Delete
  const handleDelete = async (msgId) => {
    setCtxMenu(null)
    try {
      const updated = await deleteMessage(msgId)
      setMessages(prev => prev.map(m => m.id === msgId ? updated : m))
      updateCachedMessage(updated)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete') }
  }

  // Pin
  const handlePin = async (msgId) => {
    setCtxMenu(null)
    try {
      const updated = await pinMessage(msgId)
      setMessages(prev => prev.map(m => m.id === msgId ? updated : m))
      setPinnedMsgs(prev => updated.pinned
        ? [updated, ...prev.filter(m => m.id !== msgId)]
        : prev.filter(m => m.id !== msgId))
    } catch {}
  }

  // Search
  const handleSearch = async (q) => {
    setSearchQuery(q)
    if (!q.trim() || !roomId) { setSearchResults([]); return }
    try {
      const results = await searchMessages(roomId, q)
      setSearchResults(results || [])
    } catch {}
  }

  const filteredRooms = rooms.filter(r =>
    r.displayName?.toLowerCase().includes(searchRoom.toLowerCase())
  )

  return (
    <div className="flex h-full overflow-hidden pb-14 md:pb-0">

      {/* ── Room list sidebar ── */}
      <div className={`${roomId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[340px] sidebar border-r border-white/5 shrink-0`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#202c33]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#2a3942] flex items-center justify-center text-lg">🏘️</div>
            <span className="font-semibold text-white">LocalityApp</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/people')} className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors" title="New chat">
              ✏️
            </button>
          </div>
        </div>

        {/* Search rooms */}
        <div className="px-3 py-2 bg-[#111b21]">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input className="input pl-8 py-1.5 text-sm rounded-full" placeholder="Search or start new chat"
              value={searchRoom} onChange={e => setSearchRoom(e.target.value)} />
          </div>
        </div>

        {/* Room list */}
        <div className="flex-1 overflow-y-auto">
          {roomsLoading ? (
            <div className="p-4 text-center text-gray-500 text-sm">Loading chats...</div>
          ) : filteredRooms.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              <p className="text-3xl mb-2">💬</p>
              <p>No chats yet</p>
              <button onClick={() => navigate('/people')} className="text-[#00a884] text-sm mt-1">Find people →</button>
            </div>
          ) : (
            filteredRooms.map(room => (
              <RoomItem key={room.id} room={room} active={room.id === Number(roomId)}
                onClick={() => navigate(`/chat/${room.id}`)}
                onlineUsers={onlineUsers} currentUserId={user?.id} />
            ))
          )}
        </div>
      </div>

      {/* ── Message panel ── */}
      {roomId ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0b141a]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect fill='%230b141a' width='80' height='80'/%3E%3Ccircle cx='40' cy='40' r='1' fill='%23ffffff08'/%3E%3C/svg%3E")`
        }}>

          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-2.5 bg-[#202c33] border-b border-white/5">
            <button onClick={() => navigate('/chat')} className="md:hidden text-gray-400 hover:text-white mr-1">←</button>
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-[#2a3942] flex items-center justify-center font-bold text-[#00a884]">
                {activeRoom?.type === 'BROADCAST' ? '📢' : activeRoom?.displayName?.[0]?.toUpperCase() || '?'}
              </div>
              {activeRoom?.type === 'DIRECT' && isOnline && (
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#00a884] rounded-full border-2 border-[#202c33]" />
              )}
            </div>
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => activeRoom?.type === 'GROUP' && setShowGroupInfo(true)}>
              <p className="font-semibold text-white text-sm truncate">{activeRoom?.displayName || 'Loading...'}</p>
              <p className="text-xs text-gray-400 truncate">
                {typing ? <span className="text-[#00a884] animate-pulse">{typing} is typing...</span>
                  : activeRoom?.type === 'DIRECT' ? lastSeen
                  : activeRoom?.type === 'GROUP' ? `${activeRoom.members?.length || 0} members`
                  : 'Community announcements'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {pinnedMsgs.length > 0 && (
                <button onClick={() => setShowPinned(!showPinned)}
                  className={`p-1.5 rounded-full hover:bg-white/10 transition-colors text-sm ${showPinned ? 'text-[#00a884]' : 'text-gray-400'}`}
                  title="Pinned messages">📌</button>
              )}
              <button onClick={() => setShowSearch(!showSearch)}
                className={`p-1.5 rounded-full hover:bg-white/10 transition-colors text-sm ${showSearch ? 'text-[#00a884]' : 'text-gray-400'}`}>🔍</button>
            </div>
          </div>

          {/* Search bar */}
          {showSearch && (
            <div className="bg-[#202c33] px-4 py-2 border-b border-white/5">
              <input className="input text-sm" placeholder="Search in this chat..."
                value={searchQuery} onChange={e => handleSearch(e.target.value)} autoFocus />
              {searchResults.length > 0 && (
                <p className="text-xs text-gray-400 mt-1">{searchResults.length} results</p>
              )}
            </div>
          )}

          {/* Pinned messages panel */}
          {showPinned && pinnedMsgs.length > 0 && (
            <div className="bg-[#1f2c34] border-b border-white/5 px-4 py-2 max-h-32 overflow-y-auto">
              <p className="text-xs text-[#00a884] font-medium mb-1">📌 Pinned Messages</p>
              {pinnedMsgs.map(m => (
                <div key={m.id} className="text-xs text-gray-300 py-0.5 border-b border-white/5 last:border-0">
                  <span className="text-[#00a884]">{m.sender?.name}: </span>
                  {m.messageType === 'IMAGE' ? '📷 Photo' : m.content?.slice(0, 60)}
                </div>
              ))}
            </div>
          )}

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1"
            onClick={() => { setCtxMenu(null); setShowReactions(null) }}>
            {loadingMsgs && messages.length === 0 && (
              <div className="text-center text-gray-500 py-8 text-sm">Loading messages...</div>
            )}

            {(showSearch && searchQuery ? searchResults : messages).map((msg, idx, arr) => {
              const prevMsg = arr[idx - 1]
              const showDivider = !isSameDay(prevMsg?.createdAt, msg.createdAt)
              return (
                <div key={msg.id}>
                  {showDivider && (
                    <div className="flex items-center justify-center my-3">
                      <span className="bg-[#182229] text-gray-400 text-xs px-3 py-1 rounded-full">
                        {formatDateDivider(msg.createdAt)}
                      </span>
                    </div>
                  )}
                  <MessageBubble
                    msg={msg} mine={isMine(msg)} currentUserId={user?.id}
                    onReply={() => setReplyTo(msg)}
                    onCtxMenu={(e) => {
                      e.preventDefault()
                      setCtxMenu({ msgId: msg.id, x: e.clientX, y: e.clientY, msg })
                    }}
                    onReact={(emoji) => handleReact(msg.id, emoji)}
                    showReactions={showReactions === msg.id}
                    onShowReactions={() => setShowReactions(showReactions === msg.id ? null : msg.id)}
                  />
                </div>
              )
            })}

            {typing && (
              <div className="flex gap-2 items-end pb-1">
                <div className="bg-[#202c33] rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[120px]">
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply preview */}
          {replyTo && (
            <div className="flex items-center gap-2 bg-[#1f2c34] px-4 py-2 border-t border-white/5">
              <div className="flex-1 bg-[#2a3942] rounded-lg px-3 py-1.5 border-l-2 border-[#00a884]">
                <p className="text-xs text-[#00a884] font-medium">{replyTo.sender?.name}</p>
                <p className="text-xs text-gray-400 truncate">
                  {replyTo.messageType === 'IMAGE' ? '📷 Photo' : replyTo.content}
                </p>
              </div>
              <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>
          )}

          {/* Input bar */}
          <div className="flex items-center gap-2 px-3 py-2 bg-[#202c33]">
            <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileUpload} className="hidden" />

            {recording ? (
              <div className="flex-1 flex items-center gap-3 bg-[#2a3942] rounded-full px-4 py-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm text-gray-300">
                  {String(Math.floor(recordingTime/60)).padStart(2,'0')}:{String(recordingTime%60).padStart(2,'0')}
                </span>
                <div className="flex-1 flex items-center gap-0.5 h-6">
                  {[...Array(20)].map((_, i) => (
                    <div key={i} className="voice-bar flex-1"
                      style={{ height: `${20 + Math.sin(i * 0.8 + Date.now()/200) * 10}px` }} />
                  ))}
                </div>
              </div>
            ) : (
              <>
                <button onClick={() => { setCtxMenu(null); fileInputRef.current?.click() }}
                  className="text-gray-400 hover:text-[#00a884] transition-colors p-1.5 rounded-full hover:bg-white/10"
                  disabled={uploading}>{uploading ? '⏳' : '📎'}</button>
                <input
                  className="input flex-1 rounded-full py-2"
                  placeholder="Type a message"
                  value={text}
                  onChange={handleTyping}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) sendMessage(e) }}
                />
              </>
            )}

            {text.trim() ? (
              <button onClick={sendMessage}
                className="w-10 h-10 bg-[#00a884] hover:bg-[#02be98] rounded-full flex items-center justify-center text-white transition-colors shrink-0">
                ➤
              </button>
            ) : (
              <button
                onMouseDown={startRecording} onMouseUp={stopRecording}
                onTouchStart={startRecording} onTouchEnd={stopRecording}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0
                  ${recording ? 'bg-red-500 hover:bg-red-600' : 'bg-[#00a884] hover:bg-[#02be98]'} text-white`}>
                🎤
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-[#222e35] text-center gap-4">
          <div className="w-20 h-20 bg-[#2a3942] rounded-full flex items-center justify-center text-4xl">🏘️</div>
          <div>
            <h2 className="text-white text-2xl font-light mb-1">LocalityApp</h2>
            <p className="text-gray-400 text-sm max-w-xs">
              Send messages to your neighbours and stay updated with locality news
            </p>
          </div>
          <div className="flex items-center gap-2 text-gray-500 text-xs mt-4">
            <div className="w-1 h-1 bg-[#00a884] rounded-full" />
            <span>End-to-end secured by your local network</span>
          </div>
        </div>
      )}

      {/* Context menu */}
      {ctxMenu && (
        <div ref={ctxMenuRef} className="ctx-menu slide-up"
          style={{ position: 'fixed', top: Math.min(ctxMenu.y, window.innerHeight - 280), left: Math.min(ctxMenu.x, window.innerWidth - 180) }}>
          {/* Emoji reactions row */}
          <div className="flex gap-1 px-3 py-2 border-b border-white/10">
            {REACTIONS.map(emoji => (
              <button key={emoji} onClick={() => handleReact(ctxMenu.msgId, emoji)}
                className="text-xl hover:scale-125 transition-transform">
                {emoji}
              </button>
            ))}
          </div>
          <div className="ctx-item" onClick={() => { setReplyTo(ctxMenu.msg); setCtxMenu(null) }}>
            ↩️ Reply
          </div>
          {ctxMenu.msg?.sender?.id !== user?.id ? null : (
            <>
              <div className="ctx-item" onClick={() => handlePin(ctxMenu.msgId)}>
                📌 {ctxMenu.msg?.pinned ? 'Unpin' : 'Pin'}
              </div>
              <div className="ctx-item danger" onClick={() => handleDelete(ctxMenu.msgId)}>
                🗑️ Delete for everyone
              </div>
            </>
          )}
          <div className="ctx-item" onClick={() => {
            navigator.clipboard?.writeText(ctxMenu.msg?.content || '')
            toast.success('Copied!'); setCtxMenu(null)
          }}>📋 Copy</div>
          <div className="ctx-item" onClick={() => {
            publish('/app/chat.send', {
              roomId: Number(roomId), content: ctxMenu.msg?.content,
              messageType: ctxMenu.msg?.messageType, mediaUrl: ctxMenu.msg?.mediaUrl,
              forwarded: true
            })
            setCtxMenu(null); toast.success('Message forwarded')
          }}>↗️ Forward</div>
        </div>
      )}
    </div>
  )
}

// ── Room Item ──────────────────────────────────────────────────────────────────
function RoomItem({ room, active, onClick, onlineUsers, currentUserId }) {
  const otherOnline = room.type === 'DIRECT' && room.otherUser
    ? (onlineUsers[room.otherUser.id]?.online ?? room.otherUser?.online)
    : false

  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-[#2a3942] transition-colors text-left
        ${active ? 'bg-[#2a3942]' : ''}`}>
      <div className="relative shrink-0">
        <div className="w-12 h-12 rounded-full bg-[#2a3942] flex items-center justify-center font-bold text-[#00a884] text-lg overflow-hidden">
          {room.type === 'BROADCAST' ? '📢'
            : room.otherUser?.profilePic
            ? <img src={room.otherUser.profilePic} alt="" className="w-full h-full object-cover" />
            : room.displayName?.[0]?.toUpperCase() || '?'}
        </div>
        {otherOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#00a884] rounded-full border-2 border-[#111b21]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline">
          <p className="text-sm font-medium text-white truncate">{room.displayName}</p>
          <span className="text-xs text-gray-500 shrink-0 ml-1">
            {room.lastMessage ? formatRoomTime(room.lastMessage.createdAt) : ''}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-xs text-gray-400 truncate flex-1">
            {room.lastMessage
              ? (room.lastMessage.deleted ? <em>Message deleted</em>
                : room.lastMessage.messageType === 'IMAGE' ? '📷 Photo'
                : room.lastMessage.messageType === 'VOICE' ? '🎤 Voice message'
                : room.lastMessage.content)
              : <span className="italic">No messages yet</span>}
          </p>
          {room.unreadCount > 0 && (
            <span className="w-5 h-5 bg-[#00a884] text-white text-xs rounded-full flex items-center justify-center shrink-0 ml-1 font-medium">
              {room.unreadCount > 99 ? '99+' : room.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ── Message Bubble ─────────────────────────────────────────────────────────────
function MessageBubble({ msg, mine, currentUserId, onReply, onCtxMenu, onReact, showReactions, onShowReactions }) {
  const totalReactions = msg.reactions ? Object.values(msg.reactions).reduce((a, b) => a + b.length, 0) : 0
  const readCount = msg.readBy ? msg.readBy.length : 0

  // Tick marks
  const ticks = mine ? (
    readCount > 1
      ? <span className="text-[#53bdeb]">✓✓</span>
      : <span className="text-gray-400">✓✓</span>
  ) : null

  if (msg.deleted) {
    return (
      <div className={`flex ${mine ? 'justify-end' : 'justify-start'} group`}>
        <div className={`max-w-[65%] rounded-xl px-4 py-2 text-sm italic text-gray-500 border border-white/5
          ${mine ? 'bg-[#1e3a2f]' : 'bg-[#1f2c34]'}`}>
          🚫 This message was deleted
        </div>
      </div>
    )
  }

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'} group items-end gap-1`}
      onContextMenu={onCtxMenu}>
      {/* Avatar for others */}
      {!mine && (
        <div className="w-7 h-7 rounded-full bg-[#2a3942] flex items-center justify-center text-xs font-bold text-[#00a884] shrink-0 mb-1 overflow-hidden">
          {msg.sender?.profilePic
            ? <img src={msg.sender.profilePic} alt="" className="w-full h-full object-cover" />
            : msg.sender?.name?.[0]?.toUpperCase()}
        </div>
      )}

      <div className={`max-w-[65%] flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
        {/* Sender name (groups/broadcast) */}
        {!mine && msg.roomName !== 'DM' && (
          <p className="text-xs text-[#00a884] px-1 mb-0.5">{msg.sender?.name}</p>
        )}

        <div className={`relative rounded-xl px-3 py-2 shadow-sm slide-up
          ${mine ? 'bg-[#005c4b] rounded-tr-none' : 'bg-[#202c33] rounded-tl-none'}`}>

          {/* Forwarded label */}
          {msg.forwarded && (
            <p className="text-xs text-gray-400 italic mb-1 flex items-center gap-1">↗️ Forwarded</p>
          )}

          {/* Reply quote */}
          {msg.replyTo && (
            <div className={`mb-2 pl-2 border-l-2 border-[#00a884] rounded`}>
              <p className="text-xs text-[#00a884] font-medium">{msg.replyTo.sender?.name}</p>
              <p className="text-xs text-gray-400 truncate">
                {msg.replyTo.messageType === 'IMAGE' ? '📷 Photo' : msg.replyTo.content}
              </p>
            </div>
          )}

          {/* Content */}
          {msg.messageType === 'IMAGE' && msg.mediaUrl ? (
            <div>
              <img src={msg.mediaUrl} alt="media" className="rounded-lg max-w-full max-h-60 object-cover cursor-pointer"
                onClick={() => window.open(msg.mediaUrl, '_blank')} />
              {msg.content && msg.content !== msg.mediaUrl && (
                <p className="text-sm text-gray-200 mt-1 whitespace-pre-wrap break-words">{msg.content}</p>
              )}
            </div>
          ) : msg.messageType === 'VOICE' ? (
            <VoicePlayer src={msg.mediaUrl} mine={mine} />
          ) : (
            <p className="text-sm text-gray-100 whitespace-pre-wrap break-words leading-snug">{msg.content}</p>
          )}

          {/* Time + ticks */}
          <div className={`flex items-center gap-1 mt-1 ${mine ? 'justify-end' : 'justify-start'}`}>
            <span className="text-[10px] text-gray-400">{formatMessageTime(msg.createdAt)}</span>
            {ticks && <span className="text-[10px] leading-none">{ticks}</span>}
          </div>
        </div>

        {/* Reactions */}
        {totalReactions > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 px-1">
            {Object.entries(msg.reactions || {}).map(([emoji, users]) => (
              <button key={emoji}
                onClick={() => onReact(emoji)}
                className={`reaction-pill ${users.includes(currentUserId) ? 'mine' : ''}`}>
                {emoji} <span>{users.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Long-press / hover react button */}
      <button
        onClick={onShowReactions}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-gray-300 p-1 text-xs shrink-0 mb-1">
        😊
      </button>

      {/* Inline emoji picker */}
      {showReactions && (
        <div className="absolute z-40 bg-[#233138] rounded-full shadow-2xl border border-white/10 px-2 py-1 flex gap-1"
          style={{ bottom: '100%', [mine ? 'right' : 'left']: 0 }}>
          {REACTIONS.map(e => (
            <button key={e} onClick={() => onReact(e)}
              className="text-xl hover:scale-125 transition-transform p-0.5">{e}</button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Voice Player ───────────────────────────────────────────────────────────────
function VoicePlayer({ src, mine }) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef(null)

  useEffect(() => {
    const audio = new Audio(src)
    audioRef.current = audio
    audio.onloadedmetadata = () => setDuration(audio.duration)
    audio.ontimeupdate = () => setProgress(audio.currentTime / audio.duration)
    audio.onended = () => setPlaying(false)
    return () => audio.pause()
  }, [src])

  const toggle = () => {
    if (playing) { audioRef.current?.pause(); setPlaying(false) }
    else { audioRef.current?.play(); setPlaying(true) }
  }

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <button onClick={toggle}
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors
          ${mine ? 'bg-[#00a884]/30 hover:bg-[#00a884]/50' : 'bg-white/10 hover:bg-white/20'}`}>
        {playing ? '⏸' : '▶'}
      </button>
      <div className="flex-1 flex items-center gap-1 h-6">
        {[...Array(20)].map((_, i) => (
          <div key={i}
            className={`flex-1 rounded-full transition-all ${i / 20 <= progress ? 'bg-[#00a884]' : 'bg-white/20'}`}
            style={{ height: `${8 + Math.abs(Math.sin(i * 0.6)) * 14}px` }} />
        ))}
      </div>
      <span className="text-[10px] text-gray-400">
        {String(Math.floor(duration/60)).padStart(2,'0')}:{String(Math.floor(duration%60)).padStart(2,'0')}
      </span>
    </div>
  )
}

// ── Typing dots ────────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex gap-1 items-center h-4">
      {[0,1,2].map(i => (
        <div key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  )
}
