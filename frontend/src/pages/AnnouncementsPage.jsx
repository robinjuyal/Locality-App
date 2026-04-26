import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useWs } from '../context/WsContext'
import { getAnnouncements, createAnnouncement, deleteAnnouncement } from '../api/services'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const TAG_COLORS = {
  GENERAL:     'bg-gray-100 text-gray-700',
  URGENT:      'bg-red-100 text-red-700',
  EVENT:       'bg-purple-100 text-purple-700',
  WATER:       'bg-blue-100 text-blue-700',
  ELECTRICITY: 'bg-yellow-100 text-yellow-700',
  MAINTENANCE: 'bg-orange-100 text-orange-700',
}

const TAGS = ['GENERAL', 'URGENT', 'EVENT', 'WATER', 'ELECTRICITY', 'MAINTENANCE']

export default function AnnouncementsPage() {
  const { user } = useAuth()
  const { subscribe, connected } = useWs()
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', tag: 'GENERAL', urgent: false })
  const [posting, setPosting] = useState(false)
  const isAdmin = user?.role === 'ADMIN'

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  useEffect(() => {
    if (!connected) return
    const unsub = subscribe('/topic/announcements', (a) => {
      setAnnouncements(prev => [a, ...prev])
      if (a.urgent) toast('🚨 ' + a.title, { duration: 6000, style: { background: '#fef2f2', color: '#991b1b' } })
    })
    const unsubDel = subscribe('/topic/announcements.delete', (id) => {
      setAnnouncements(prev => prev.filter(a => a.id !== id))
    })
    return () => { unsub(); unsubDel() }
  }, [connected])

  const fetchAnnouncements = async () => {
    try {
      const data = await getAnnouncements(0)
      setAnnouncements(data?.content || [])
    } catch { toast.error('Failed to load announcements') }
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
      toast.success('Announcement posted!')
    } catch { toast.error('Failed to post') }
    finally { setPosting(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return
    try {
      await deleteAnnouncement(id)
      setAnnouncements(prev => prev.filter(a => a.id !== id))
      toast.success('Deleted')
    } catch { toast.error('Failed to delete') }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden pb-14 md:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white">
        <div>
          <h2 className="font-bold text-gray-900 text-lg">Notice Board</h2>
          <p className="text-xs text-gray-500">Locality updates & announcements</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary px-4 py-2 text-sm">
            {showForm ? 'Cancel' : '+ Post'}
          </button>
        )}
      </div>

      {/* Post form (admin only) */}
      {isAdmin && showForm && (
        <form onSubmit={handlePost} className="bg-blue-50 border-b border-blue-100 p-4 space-y-3">
          <input className="input" placeholder="Title" value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          <textarea className="input resize-none" rows={3} placeholder="Content..."
            value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required />
          <div className="flex gap-3 items-center flex-wrap">
            <select className="input w-auto" value={form.tag}
              onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}>
              {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.urgent}
                onChange={e => setForm(f => ({ ...f, urgent: e.target.checked }))} />
              <span className="text-red-600 font-medium">Mark as Urgent</span>
            </label>
            <button type="submit" className="btn-primary ml-auto" disabled={posting}>
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center text-gray-400 py-10">Loading...</div>
        ) : announcements.length === 0 ? (
          <div className="text-center text-gray-400 py-10">
            <p className="text-4xl mb-2">📋</p>
            <p>No announcements yet</p>
          </div>
        ) : (
          announcements.map(a => (
            <div key={a.id} className={`card p-4 ${a.urgent ? 'border-l-4 border-l-red-500' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {a.urgent && <span className="text-red-600 text-sm">🚨</span>}
                  <h3 className="font-semibold text-gray-900">{a.title}</h3>
                  <span className={`badge ${TAG_COLORS[a.tag] || TAG_COLORS.GENERAL}`}>{a.tag}</span>
                </div>
                {isAdmin && (
                  <button onClick={() => handleDelete(a.id)}
                    className="text-gray-400 hover:text-red-500 text-sm shrink-0">✕</button>
                )}
              </div>
              <p className="text-gray-600 text-sm mt-2 whitespace-pre-wrap">{a.content}</p>
              <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
                <span>By {a.postedBy?.name}</span>
                <span>·</span>
                <span>{a.createdAt ? format(new Date(a.createdAt), 'dd MMM yyyy, HH:mm') : ''}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
