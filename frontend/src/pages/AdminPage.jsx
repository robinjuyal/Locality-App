import { useState, useEffect } from 'react'
import {
  adminGetAllUsers, registerUser, toggleUser,
  adminTopUp, getPendingSettlements, markSettlementPaid, triggerSettlement
} from '../api/services'
import toast from 'react-hot-toast'

const TABS = ['Users', 'Register', 'Top-Up', 'Settlements']
const ROLES = ['RESIDENT', 'SHOPKEEPER', 'ADMIN']

export default function AdminPage() {
  const [tab, setTab] = useState('Users')

  return (
    <div className="flex flex-col h-full overflow-hidden pb-14 md:pb-0">
      <div className="px-5 py-4 border-b border-gray-200 bg-white">
        <h2 className="font-bold text-gray-900 text-lg">⚙️ Admin Panel</h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white px-4 gap-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
              ${tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'Users' && <UsersTab />}
        {tab === 'Register' && <RegisterTab />}
        {tab === 'Top-Up' && <TopUpTab />}
        {tab === 'Settlements' && <SettlementsTab />}
      </div>
    </div>
  )
}

// ── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    adminGetAllUsers().then(setUsers).catch(() => toast.error('Failed to load users')).finally(() => setLoading(false))
  }, [])

  const handleToggle = async (userId) => {
    try {
      const updated = await toggleUser(userId)
      setUsers(prev => prev.map(u => u.id === userId ? updated : u))
      toast.success(updated.active ? 'User activated' : 'User deactivated')
    } catch { toast.error('Failed') }
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.phone.includes(search) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  )

  const roleColors = { ADMIN: 'bg-purple-100 text-purple-700', RESIDENT: 'bg-blue-100 text-blue-700', SHOPKEEPER: 'bg-green-100 text-green-700' }

  return (
    <div className="space-y-3">
      <input className="input" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
      <p className="text-xs text-gray-500">{users.length} total users</p>
      {loading ? <div className="text-center text-gray-400 py-8">Loading...</div> : filtered.map(u => (
        <div key={u.id} className="card flex items-center gap-3 p-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600">
            {u.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900">{u.name}</p>
              <span className={`badge ${roleColors[u.role]}`}>{u.role.toLowerCase()}</span>
              {!u.active && <span className="badge bg-red-100 text-red-600">inactive</span>}
            </div>
            <p className="text-xs text-gray-500">{u.phone} {u.houseNumber ? `· House ${u.houseNumber}` : ''} {u.shopName ? `· ${u.shopName}` : ''}</p>
          </div>
          {u.role !== 'ADMIN' && (
            <button onClick={() => handleToggle(u.id)}
              className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors
                ${u.active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
              {u.active ? 'Disable' : 'Enable'}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Register Tab ─────────────────────────────────────────────────────────────

function RegisterTab() {
  const [form, setForm] = useState({ phone: '', password: '', name: '', role: 'RESIDENT', houseNumber: '', shopName: '', upiId: '' })
  const [loading, setLoading] = useState(false)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await registerUser(form)
      toast.success(`${form.name} registered successfully!`)
      setForm({ phone: '', password: '', name: '', role: 'RESIDENT', houseNumber: '', shopName: '', upiId: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <h3 className="font-semibold text-gray-900">Register New Member</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Phone *</label>
          <input className="input" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Password *</label>
          <input className="input" type="password" value={form.password} onChange={e => set('password', e.target.value)} required minLength={4} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Role *</label>
          <select className="input" value={form.role} onChange={e => set('role', e.target.value)}>
            {ROLES.map(r => <option key={r} value={r}>{r.toLowerCase()}</option>)}
          </select>
        </div>
      </div>

      {form.role === 'RESIDENT' && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">House Number</label>
          <input className="input" placeholder="e.g. A-102" value={form.houseNumber} onChange={e => set('houseNumber', e.target.value)} />
        </div>
      )}

      {form.role === 'SHOPKEEPER' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Shop Name *</label>
            <input className="input" value={form.shopName} onChange={e => set('shopName', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">UPI ID (for nightly settlement)</label>
            <input className="input" placeholder="name@upi" value={form.upiId} onChange={e => set('upiId', e.target.value)} />
          </div>
        </div>
      )}

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? 'Registering...' : 'Register Member'}
      </button>
    </form>
  )
}

// ── Top-Up Tab ────────────────────────────────────────────────────────────────

function TopUpTab() {
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    adminGetAllUsers().then(u => setUsers(u.filter(x => x.role !== 'ADMIN'))).catch(() => {})
  }, [])

  const handleTopUp = async (e) => {
    e.preventDefault()
    if (!selectedUser || !amount) return
    setLoading(true)
    try {
      await adminTopUp(Number(selectedUser), Number(amount))
      const userName = users.find(u => u.id === Number(selectedUser))?.name
      toast.success(`₹${amount} tokens added to ${userName}`)
      setAmount('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Top-up failed')
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleTopUp} className="space-y-4 max-w-md">
      <h3 className="font-semibold text-gray-900">Add Tokens to Wallet</h3>
      <p className="text-xs text-gray-500">Collect cash from the resident, then credit their wallet here.</p>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Select Member</label>
        <select className="input" value={selectedUser} onChange={e => setSelectedUser(e.target.value)} required>
          <option value="">-- Choose member --</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.name} ({u.role.toLowerCase()}) — {u.phone}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Amount (₹ = tokens)</label>
        <input className="input" type="number" min="1" placeholder="e.g. 500"
          value={amount} onChange={e => setAmount(e.target.value)} required />
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
        💡 Make sure you have received the cash before crediting tokens.
      </div>

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? 'Adding...' : `Add ₹${amount || '0'} Tokens`}
      </button>
    </form>
  )
}

// ── Settlements Tab ───────────────────────────────────────────────────────────

function SettlementsTab() {
  const [settlements, setSettlements] = useState([])
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)

  const fetch = () => {
    setLoading(true)
    getPendingSettlements()
      .then(setSettlements)
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [])

  const handlePaid = async (id, shopName) => {
    const note = prompt(`Note for ${shopName} settlement (optional):`) ?? ''
    try {
      await markSettlementPaid(id, note)
      setSettlements(prev => prev.filter(s => s.id !== id))
      toast.success('Marked as paid!')
    } catch { toast.error('Failed') }
  }

  const handleTrigger = async () => {
    if (!confirm('Run settlement job now? This will create settlement records for all shopkeepers.')) return
    setTriggering(true)
    try {
      await triggerSettlement()
      toast.success('Settlement job triggered!')
      setTimeout(fetch, 1000)
    } catch { toast.error('Failed') }
    finally { setTriggering(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Pending Settlements</h3>
          <p className="text-xs text-gray-500">Transfer money to shopkeepers via UPI, then mark paid</p>
        </div>
        <button onClick={handleTrigger} disabled={triggering} className="btn-secondary text-xs px-3 py-1.5">
          {triggering ? 'Running...' : '▶ Run Now'}
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-8">Loading...</div>
      ) : settlements.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">
          <p className="text-3xl mb-2">✅</p>
          <p>No pending settlements</p>
        </div>
      ) : settlements.map(s => (
        <div key={s.id} className="card p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-gray-900">{s.shopName || s.shopkeeperName}</p>
              <p className="text-xs text-gray-500">{s.shopkeeperName} · UPI: {s.upiId || 'Not set'}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">₹{s.amount?.toFixed(2)}</p>
              <p className="text-xs text-gray-400">{s.settlementDate}</p>
            </div>
          </div>

          {s.upiId && (
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm font-mono text-gray-700 flex items-center justify-between">
              <span>{s.upiId}</span>
              <button onClick={() => { navigator.clipboard?.writeText(s.upiId); toast.success('Copied!') }}
                className="text-xs text-primary-600 ml-2">Copy</button>
            </div>
          )}

          <button onClick={() => handlePaid(s.id, s.shopName)}
            className="btn-primary w-full text-sm py-2">
            ✓ Mark as Paid
          </button>
        </div>
      ))}
    </div>
  )
}
