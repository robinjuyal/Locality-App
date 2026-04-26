import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getAllUsers } from '../api/services'
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

  useEffect(() => {
    getAllUsers()
      .then(data => setPeople(data || []))
      .catch(() => toast.error('Failed to load people'))
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
    } catch {
      toast.error('Could not open chat')
    } finally {
      setStarting(null)
    }
  }

  const roleColors = {
    ADMIN:       'bg-purple-100 text-purple-700',
    RESIDENT:    'bg-blue-100 text-blue-700',
    SHOPKEEPER:  'bg-green-100 text-green-700',
  }

  return (
    <div className="flex flex-col h-full overflow-hidden pb-14 md:pb-0">
      <div className="px-5 py-4 border-b border-gray-200 bg-white space-y-3">
        <h2 className="font-bold text-gray-900 text-lg">People</h2>
        <input className="input" placeholder="Search by name or role..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="text-center text-gray-400 py-10">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-10">No people found</div>
        ) : (
          filtered.map(person => (
            <div key={person.id} className="card flex items-center gap-3 p-4">
              <div className="w-11 h-11 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-600 text-lg shrink-0">
                {person.profilePic
                  ? <img src={person.profilePic} alt="" className="w-full h-full rounded-full object-cover" />
                  : person.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 text-sm">{person.name}</p>
                  <span className={`badge ${roleColors[person.role]}`}>
                    {person.role.toLowerCase()}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {person.shopName || person.houseNumber || person.phone}
                </p>
              </div>
              <button
                onClick={() => handleMessage(person)}
                disabled={starting === person.id}
                className="btn-secondary text-xs px-3 py-1.5">
                {starting === person.id ? '...' : '💬 Chat'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
