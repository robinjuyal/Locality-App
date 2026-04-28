import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useWs } from '../context/WsContext'
import { getAnnouncements, createAnnouncement, deleteAnnouncement } from '../api/services'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const TAG_COLORS = {
  GENERAL:     'bg-gray-500/20 text-gray-300',
  URGENT:      'bg-red-500/20 text-red-400',
  EVENT:       'bg-purple-500/20 text-purple-300',
  WATER:       'bg-blue-500/20 text-blue-300',
  ELECTRICITY: 'bg-yellow-500/20 text-yellow-300',
  MAINTENANCE: 'bg-orange-500/20 text-orange-300',
}
const TAG_ICONS = {
  GENERAL: '📋', URGENT: '🚨', EVENT: '🎉',
  WATER: '💧', ELECTRICITY: '⚡', MAINTENANCE: '🔧'
}
const TAGS = ['GENERAL','URGENT','EVENT','WATER','ELECTRICITY','MAINTENANCE']

export default function AnnouncementsPage() {
  const { user } = useAuth()
  const { subscribe, connected } = useWs()
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [activeTag, setActiveTag] = useState('ALL')
  const [form, setForm] = useState({ title: '', content: '', tag: 'GENERAL', urgent: false })
  const [posting, setPosting] = useState(false)
  const isAdmin = user?.role === 'ADMIN'

  useEffect(() => { fetchAll() }, [])

  useEffect(() => {
    if (!connected) return
    const unsub = subscribe('/topic/announcements', (a) => {
      setAnnouncements(prev => [a, ...prev])
      if (a.urgent) {
        toast(`🚨 ${a.title}`, {
          duration: 8000,
          style: { background: '#2d1515', color: '#fca5a5', border: '1px solid #991b1b' }
        })
      }
    })
    const unsubDel = subscribe('/topic/announcements.delete', (id) => {
      setAnnouncements(prev => prev.filter(a => a.id !== id))
    })
    return () => { unsub(); unsubDel() }
  }, [connected])

  const fetchAll = async () => {
    try {
      const data = await getAnnouncements(0)
      setAnnouncements(data?.content || [])
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }

  const handlePost = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.content.trim()) return
    setPosting(true)
    try {
      await createAnnouncement(form)
      setForm({ title: '', content: '', tag: 'GENERAL', urgent: false })
      setShowForm(false)
      toast.success('Posted!')
    } catch { toast.error('Failed to post') }
    finally { setPosting(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return
    try {
      await deleteAnnouncement(id)
      setAnnouncements(prev => prev.filter(a => a.id !== id))
      toast.success('Deleted')
    } catch { toast.error('Failed') }
  }

  const filtered = activeTag === 'ALL'
    ? announcements
    : announcements.filter(a => a.tag === activeTag)

  return (
    <div className="flex flex-col h-full overflow-hidden pb-14 lg:pb-0 bg-[#111b21]">
      {/* Header */}
      <div className="bg-[#202c33] border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h2 className="font-bold text-white text-lg">Notice Board</h2>
            <p className="text-xs text-gray-400">Locality updates & announcements</p>
          </div>
          {isAdmin && (
            <button onClick={() => setShowForm(!showForm)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${showForm ? 'bg-white/10 text-gray-300' : 'bg-[#00a884] hover:bg-[#02be98] text-white'}`}>
              {showForm ? 'Cancel' : '+ Post'}
            </button>
          )}
        </div>

        {/* Tag filter pills */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
          {['ALL', ...TAGS].map(tag => (
            <button key={tag} onClick={() => setActiveTag(tag)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors
                ${activeTag === tag ? 'bg-[#00a884] text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
              {tag !== 'ALL' && TAG_ICONS[tag] + ' '}{tag}
            </button>
          ))}
        </div>
      </div>

      {/* Post form */}
      {isAdmin && showForm && (
        <form onSubmit={handlePost} className="bg-[#1f2c34] border-b border-white/5 p-4 space-y-3">
          <input className="input" placeholder="Title" value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          <textarea className="input resize-none" rows={3} placeholder="Write your announcement..."
            value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required />
          <div className="flex flex-wrap gap-3 items-center">
            <select className="input w-auto bg-[#2a3942]" value={form.tag}
              onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}>
              {TAGS.map(t => <option key={t} value={t}>{TAG_ICONS[t]} {t}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.urgent} className="accent-[#00a884]"
                onChange={e => setForm(f => ({ ...f, urgent: e.target.checked }))} />
              <span className="text-red-400 font-medium">🚨 Mark Urgent</span>
            </label>
            <button type="submit" className="btn-primary ml-auto px-6" disabled={posting}>
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center text-gray-500 py-10">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-500 py-14">
            <p className="text-5xl mb-3">📋</p>
            <p className="text-sm">No announcements{activeTag !== 'ALL' ? ` in ${activeTag}` : ' yet'}</p>
          </div>
        ) : (
          filtered.map(a => (
            <div key={a.id}
              className={`card p-4 transition-all ${a.urgent ? 'border-l-4 border-l-red-500 bg-[#2a1515]' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-lg">{TAG_ICONS[a.tag] || '📋'}</span>
                    <h3 className="font-semibold text-white">{a.title}</h3>
                    <span className={`badge ${TAG_COLORS[a.tag] || TAG_COLORS.GENERAL}`}>{a.tag}</span>
                    {a.urgent && <span className="badge bg-red-500/20 text-red-400">URGENT</span>}
                  </div>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{a.content}</p>
                  <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                    <div className="w-5 h-5 rounded-full bg-[#2a3942] flex items-center justify-center text-[10px] font-bold text-[#00a884]">
                      {a.postedBy?.name?.[0]}
                    </div>
                    <span>{a.postedBy?.name}</span>
                    <span>·</span>
                    <span>{a.createdAt ? format(new Date(a.createdAt), 'dd MMM yyyy, HH:mm') : ''}</span>
                  </div>
                </div>
                {isAdmin && (
                  <button onClick={() => handleDelete(a.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors shrink-0 p-1">✕</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
