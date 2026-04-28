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
    <div className="flex flex-col h-full overflow-hidden pb-14 lg:pb-0 bg-[#111b21]">
      <div className="bg-[#202c33] border-b border-white/5">
        <div className="px-4 py-3">
          <h2 className="font-bold text-white text-lg">⚙️ Admin Panel</h2>
          <p className="text-xs text-gray-400">Manage your locality</p>
        </div>
        <div className="flex px-4 gap-0 overflow-x-auto">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors
                ${tab === t ? 'border-[#00a884] text-[#00a884]' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>
              {t}
            </button>
          ))}
        </div>
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

function UsersTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    adminGetAllUsers().then(setUsers).catch(() => toast.error('Failed'))
      .finally(() => setLoading(false))
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

  const roleColors = {
    ADMIN: 'bg-purple-500/20 text-purple-300',
    RESIDENT: 'bg-blue-500/20 text-blue-300',
    SHOPKEEPER: 'bg-[#00a884]/20 text-[#00a884]'
  }

  const stats = {
    total: users.length,
    residents: users.filter(u => u.role === 'RESIDENT').length,
    shopkeepers: users.filter(u => u.role === 'SHOPKEEPER').length,
    inactive: users.filter(u => !u.active).length,
  }

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Total', val: stats.total, color: 'text-white' },
          { label: 'Residents', val: stats.residents, color: 'text-blue-300' },
          { label: 'Shops', val: stats.shopkeepers, color: 'text-[#00a884]' },
          { label: 'Inactive', val: stats.inactive, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="card p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input className="input pl-8 rounded-full" placeholder="Search users..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-10">Loading...</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(u => (
            <div key={u.id} className="card flex items-center gap-3 p-3 hover:bg-[#2a3942] transition-colors">
              <div className="w-10 h-10 rounded-full bg-[#2a3942] flex items-center justify-center font-bold text-[#00a884] overflow-hidden shrink-0">
                {u.profilePic
                  ? <img src={u.profilePic} alt="" className="w-full h-full object-cover" />
                  : u.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-white">{u.name}</p>
                  <span className={`badge ${roleColors[u.role]}`}>{u.role.toLowerCase()}</span>
                  {!u.active && <span className="badge bg-red-500/20 text-red-400">inactive</span>}
                  {u.online && <span className="badge bg-[#00a884]/20 text-[#00a884]">online</span>}
                </div>
                <p className="text-xs text-gray-500 truncate">
                  {u.phone}{u.houseNumber ? ` · 🏠 ${u.houseNumber}` : ''}{u.shopName ? ` · 🏪 ${u.shopName}` : ''}
                </p>
              </div>
              {u.role !== 'ADMIN' && (
                <button onClick={() => handleToggle(u.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0
                    ${u.active ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-[#00a884]/20 text-[#00a884] hover:bg-[#00a884]/30'}`}>
                  {u.active ? 'Disable' : 'Enable'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RegisterTab() {
  const [form, setForm] = useState({ phone: '', password: '', name: '', role: 'RESIDENT', houseNumber: '', shopName: '', upiId: '' })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await registerUser(form)
      toast.success(`✅ ${form.name} registered!`)
      setForm({ phone: '', password: '', name: '', role: 'RESIDENT', houseNumber: '', shopName: '', upiId: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div className="card p-4 space-y-1">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Member Type</p>
        <div className="grid grid-cols-3 gap-2">
          {ROLES.map(r => (
            <button key={r} type="button" onClick={() => set('role', r)}
              className={`py-2 px-3 rounded-xl text-sm font-medium transition-all
                ${form.role === r
                  ? 'bg-[#00a884] text-white shadow-lg shadow-[#00a884]/20'
                  : 'bg-[#2a3942] text-gray-400 hover:bg-[#2a3942]/80'}`}>
              {r === 'RESIDENT' ? '🏠' : r === 'SHOPKEEPER' ? '🏪' : '⚙️'} {r.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <p className="text-xs text-gray-400 uppercase tracking-wider">Personal Info</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Full Name *</label>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Phone *</label>
            <input className="input" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} required />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Password *</label>
          <input className="input" type="password" value={form.password}
            onChange={e => set('password', e.target.value)} required minLength={4}
            placeholder="Minimum 4 characters" />
        </div>
        {form.role === 'RESIDENT' && (
          <div>
            <label className="text-xs text-gray-500 mb-1 block">House Number</label>
            <input className="input" placeholder="e.g. A-102, Block 3" value={form.houseNumber}
              onChange={e => set('houseNumber', e.target.value)} />
          </div>
        )}
        {form.role === 'SHOPKEEPER' && (
          <>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Shop Name *</label>
              <input className="input" value={form.shopName} onChange={e => set('shopName', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">UPI ID (for nightly settlement)</label>
              <input className="input" placeholder="shopname@upi" value={form.upiId}
                onChange={e => set('upiId', e.target.value)} />
            </div>
          </>
        )}
      </div>

      <button type="submit" className="btn-primary w-full py-3 text-base" disabled={loading}>
        {loading ? 'Registering...' : '+ Register Member'}
      </button>
    </form>
  )
}

function TopUpTab() {
  const [users, setUsers] = useState([])
  const [selected, setSelected] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    adminGetAllUsers().then(u => setUsers(u.filter(x => x.role !== 'ADMIN'))).catch(() => {})
  }, [])

  const handleTopUp = async (e) => {
    e.preventDefault()
    if (!selected || !amount) return
    setLoading(true)
    try {
      await adminTopUp(Number(selected), Number(amount))
      const name = users.find(u => u.id === Number(selected))?.name
      toast.success(`✅ ₹${amount} tokens added to ${name}`)
      setAmount('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Top-up failed')
    } finally { setLoading(false) }
  }

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) || u.phone.includes(search)
  )

  return (
    <form onSubmit={handleTopUp} className="space-y-4 max-w-md">
      <div className="card p-4 space-y-3">
        <p className="text-xs text-gray-400 uppercase tracking-wider">Select Member</p>
        <input className="input" placeholder="Search member..." value={search}
          onChange={e => setSearch(e.target.value)} />
        <div className="max-h-48 overflow-y-auto space-y-1">
          {filteredUsers.map(u => (
            <label key={u.id}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all
                ${selected === String(u.id) ? 'bg-[#00a884]/20 border border-[#00a884]/30' : 'hover:bg-[#2a3942]'}`}>
              <input type="radio" name="user" value={u.id} checked={selected === String(u.id)}
                onChange={e => setSelected(e.target.value)} className="accent-[#00a884]" />
              <div className="w-8 h-8 rounded-full bg-[#2a3942] flex items-center justify-center text-sm font-bold text-[#00a884] shrink-0">
                {u.name?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">{u.name}</p>
                <p className="text-xs text-gray-500">{u.phone} · {u.role.toLowerCase()}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <p className="text-xs text-gray-400 uppercase tracking-wider">Amount</p>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
          <input className="input pl-7 text-2xl font-bold py-4" type="number" min="1"
            placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} required />
        </div>
        <div className="flex gap-2">
          {[100, 200, 500, 1000].map(v => (
            <button key={v} type="button" onClick={() => setAmount(String(v))}
              className="flex-1 py-2 rounded-lg bg-[#2a3942] text-sm text-gray-300 hover:bg-[#00a884]/20 hover:text-[#00a884] transition-colors">
              ₹{v}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 text-xs text-yellow-300">
        💡 Collect the cash from the resident first, then credit their wallet here.
      </div>

      <button type="submit" className="btn-primary w-full py-3 text-base" disabled={loading || !selected || !amount}>
        {loading ? 'Adding...' : `Add ₹${amount || '0'} Tokens`}
      </button>
    </form>
  )
}

function SettlementsTab() {
  const [settlements, setSettlements] = useState([])
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)

  const fetch = () => {
    setLoading(true)
    getPendingSettlements().then(setSettlements).catch(() => toast.error('Failed'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [])

  const handlePaid = async (id, shopName) => {
    const note = prompt(`Payment note for ${shopName} (optional):`) ?? ''
    try {
      await markSettlementPaid(id, note)
      setSettlements(prev => prev.filter(s => s.id !== id))
      toast.success('✅ Marked as paid!')
    } catch { toast.error('Failed') }
  }

  const handleTrigger = async () => {
    if (!confirm('Run settlement job now?')) return
    setTriggering(true)
    try {
      await triggerSettlement()
      toast.success('Settlement job triggered!')
      setTimeout(fetch, 1500)
    } catch { toast.error('Failed') }
    finally { setTriggering(false) }
  }

  const total = settlements.reduce((sum, s) => sum + Number(s.amount || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">Pending Payouts</h3>
          {settlements.length > 0 && (
            <p className="text-xs text-gray-400">Total: ₹{total.toFixed(2)} across {settlements.length} shops</p>
          )}
        </div>
        <button onClick={handleTrigger} disabled={triggering}
          className="bg-[#2a3942] hover:bg-[#2a3942]/80 text-gray-300 text-xs px-3 py-2 rounded-lg transition-colors">
          {triggering ? '⏳ Running...' : '▶ Run Now'}
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-10">Loading...</div>
      ) : settlements.length === 0 ? (
        <div className="card p-10 text-center text-gray-500">
          <p className="text-4xl mb-2">✅</p>
          <p className="text-sm">All settled! No pending payouts.</p>
        </div>
      ) : (
        settlements.map(s => (
          <div key={s.id} className="card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-white">{s.shopName || s.shopkeeperName}</p>
                <p className="text-xs text-gray-400">{s.shopkeeperName} · {s.settlementDate}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-[#00a884]">₹{Number(s.amount || 0).toFixed(2)}</p>
              </div>
            </div>
            {s.upiId ? (
              <div className="flex items-center justify-between bg-[#2a3942] rounded-xl px-4 py-2.5">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">UPI ID</p>
                  <p className="text-sm font-mono text-white">{s.upiId}</p>
                </div>
                <button onClick={() => { navigator.clipboard?.writeText(s.upiId); toast.success('Copied!') }}
                  className="text-xs text-[#00a884] bg-[#00a884]/10 px-3 py-1.5 rounded-lg hover:bg-[#00a884]/20 transition-colors">
                  Copy
                </button>
              </div>
            ) : (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 text-xs text-red-400">
                ⚠️ No UPI ID set for this shopkeeper
              </div>
            )}
            <button onClick={() => handlePaid(s.id, s.shopName || s.shopkeeperName)}
              className="btn-primary w-full py-2.5 text-sm">
              ✓ Confirm Paid via UPI
            </button>
          </div>
        ))
      )}
    </div>
  )
}
