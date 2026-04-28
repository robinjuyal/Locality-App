import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getAllUsers, createGroup } from '../api/services'
import { useRooms } from '../hooks/useRooms'
import toast from 'react-hot-toast'

export default function PeoplePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { startDirectChat } = useRooms()
  const [people, setPeople] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(null)
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [selectedMembers, setSelectedMembers] = useState([])
  const [creatingGroup, setCreatingGroup] = useState(false)

  useEffect(() => {
    getAllUsers().then(d => setPeople(d || [])).catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = people.filter(p =>
    p.id !== user?.id &&
    (p.name.toLowerCase().includes(search.toLowerCase()) ||
     p.role.toLowerCase().includes(search.toLowerCase()) ||
     (p.shopName || '').toLowerCase().includes(search.toLowerCase()))
  )

  const handleMessage = async (person) => {
    setStarting(person.id)
    try {
      const room = await startDirectChat(person.id)
      navigate(`/chat/${room.id}`)
    } catch { toast.error('Could not open chat') }
    finally { setStarting(null) }
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) {
      toast.error('Enter group name and select members')
      return
    }
    setCreatingGroup(true)
    try {
      const room = await createGroup(groupName, selectedMembers)
      toast.success(`Group "${groupName}" created!`)
      navigate(`/chat/${room.id}`)
    } catch { toast.error('Failed to create group') }
    finally { setCreatingGroup(false) }
  }

  const roleColors = {
    ADMIN: 'bg-purple-500/20 text-purple-300',
    RESIDENT: 'bg-blue-500/20 text-blue-300',
    SHOPKEEPER: 'bg-[#00a884]/20 text-[#00a884]',
  }

  return (
    <div className="flex flex-col h-full overflow-hidden pb-14 lg:pb-0 bg-[#111b21]">
      <div className="px-4 py-3 bg-[#202c33] border-b border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-white text-lg">People</h2>
          <button onClick={() => setShowGroupForm(!showGroupForm)}
            className="text-sm text-[#00a884] hover:text-[#02be98] transition-colors">
            {showGroupForm ? 'Cancel' : '+ New Group'}
          </button>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input className="input pl-8 rounded-full" placeholder="Search people..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Group creation form */}
      {showGroupForm && (
        <div className="bg-[#1f2c34] border-b border-white/5 p-4 space-y-3">
          <input className="input" placeholder="Group name" value={groupName}
            onChange={e => setGroupName(e.target.value)} />
          <p className="text-xs text-gray-400">
            Select members ({selectedMembers.length} selected):
          </p>
          <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
            {people.filter(p => p.id !== user?.id).map(p => (
              <label key={p.id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors
                ${selectedMembers.includes(p.id) ? 'bg-[#00a884]/20 border border-[#00a884]/30' : 'bg-[#2a3942]'}`}>
                <input type="checkbox" checked={selectedMembers.includes(p.id)}
                  onChange={e => setSelectedMembers(prev =>
                    e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id))}
                  className="accent-[#00a884]" />
                <span className="text-sm text-white truncate">{p.name}</span>
              </label>
            ))}
          </div>
          <button onClick={handleCreateGroup} className="btn-primary w-full text-sm" disabled={creatingGroup}>
            {creatingGroup ? 'Creating...' : `Create Group (${selectedMembers.length} members)`}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-center text-gray-500 py-10 text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-500 py-10 text-sm">No people found</div>
        ) : (
          filtered.map(person => (
            <div key={person.id} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 hover:bg-[#2a3942] transition-colors">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-[#2a3942] flex items-center justify-center font-bold text-[#00a884] text-lg overflow-hidden shrink-0">
                  {person.profilePic
                    ? <img src={person.profilePic} alt="" className="w-full h-full object-cover" />
                    : person.name?.[0]?.toUpperCase()}
                </div>
                {person.online && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#00a884] rounded-full border-2 border-[#111b21]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-white text-sm">{person.name}</p>
                  <span className={`badge ${roleColors[person.role]}`}>{person.role.toLowerCase()}</span>
                </div>
                <p className="text-xs text-gray-500">{person.shopName || person.houseNumber || person.about || person.phone}</p>
              </div>
              <button onClick={() => handleMessage(person)} disabled={starting === person.id}
                className="btn-secondary text-xs px-3 py-1.5">
                {starting === person.id ? '...' : '💬'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
