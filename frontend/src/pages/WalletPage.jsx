import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getMyWallet, getTransactions, getShopkeepers, payShopkeeper } from '../api/services'
import { QRCodeSVG } from 'qrcode.react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function WalletPage() {
  const { user } = useAuth()
  const isShopkeeper = user?.role === 'SHOPKEEPER'
  const [wallet, setWallet] = useState(null)
  const [txns, setTxns] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPay, setShowPay] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    Promise.all([getMyWallet(), getTransactions(0)])
      .then(([w, t]) => { setWallet(w); setTxns(t || []) })
      .catch(() => toast.error('Failed to load wallet'))
      .finally(() => setLoading(false))
  }, [])

  const loadMore = async () => {
    const next = page + 1
    try {
      const more = await getTransactions(next)
      if (!more || more.length === 0) { setHasMore(false); return }
      setTxns(prev => [...prev, ...more])
      setPage(next)
    } catch {}
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-[#111b21]">
      <div className="w-8 h-8 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="flex flex-col h-full overflow-hidden pb-14 lg:pb-0 bg-[#111b21]">
      <div className="px-4 py-3 bg-[#202c33] border-b border-white/5">
        <h2 className="font-bold text-white text-lg">Wallet</h2>
        <p className="text-xs text-gray-400">1 Token = ₹1.00</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Balance card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#00a884] to-[#017561] p-6 shadow-xl">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative">
            <p className="text-white/70 text-sm mb-1">Available Balance</p>
            <p className="text-4xl font-bold text-white">₹{Number(wallet?.balance || 0).toFixed(2)}</p>
            <p className="text-white/60 text-xs mt-1">{Math.floor(wallet?.balance || 0)} tokens</p>
            {isShopkeeper && (
              <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-white/60 text-xs">Total Earned</p>
                  <p className="text-white font-semibold text-lg">₹{Number(wallet?.totalEarned || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-white/60 text-xs">Pending Payout</p>
                  <p className="text-white font-semibold text-lg">₹{Number(wallet?.pendingSettlement || 0).toFixed(2)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className={`grid gap-3 ${isShopkeeper ? 'grid-cols-2' : 'grid-cols-2'}`}>
          {!isShopkeeper && (
            <button onClick={() => setShowPay(true)}
              className="card p-4 flex flex-col items-center gap-2 hover:bg-[#2a3942] transition-colors">
              <div className="w-12 h-12 rounded-full bg-[#00a884]/20 flex items-center justify-center text-2xl">💸</div>
              <p className="text-sm font-medium text-white">Pay Shop</p>
              <p className="text-xs text-gray-500">Use tokens</p>
            </button>
          )}
          {isShopkeeper && (
            <button onClick={() => setShowQR(!showQR)}
              className="card p-4 flex flex-col items-center gap-2 hover:bg-[#2a3942] transition-colors">
              <div className="w-12 h-12 rounded-full bg-[#00a884]/20 flex items-center justify-center text-2xl">📲</div>
              <p className="text-sm font-medium text-white">My QR Code</p>
              <p className="text-xs text-gray-500">Show to customers</p>
            </button>
          )}
          <div className="card p-4 flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-2xl">📊</div>
            <p className="text-sm font-medium text-white">{txns.length}+ Txns</p>
            <p className="text-xs text-gray-500">All history</p>
          </div>
        </div>

        {/* QR for shopkeeper */}
        {isShopkeeper && showQR && (
          <div className="card p-6 flex flex-col items-center gap-4">
            <p className="font-semibold text-white">{user?.shopName}</p>
            <div className="bg-white p-4 rounded-2xl">
              <QRCodeSVG
                value={JSON.stringify({ shopkeeperId: user?.id, shopName: user?.shopName })}
                size={200} bgColor="#ffffff" fgColor="#111b21" />
            </div>
            <p className="text-xs text-gray-500 text-center">
              Customers scan this QR to pay you in tokens
            </p>
          </div>
        )}

        {/* Pay modal */}
        {showPay && (
          <PayModal
            onClose={() => setShowPay(false)}
            onSuccess={(newWallet) => { setWallet(newWallet); setShowPay(false) }}
          />
        )}

        {/* Transactions */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-semibold text-white text-sm">Transaction History</h3>
            <span className="text-xs text-gray-500">{txns.length} records</span>
          </div>
          {txns.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              <p className="text-4xl mb-2">💳</p>
              <p>No transactions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {txns.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0
                    ${t.type === 'CREDIT' ? 'bg-[#00a884]/20' : 'bg-red-500/20'}`}>
                    {t.type === 'CREDIT' ? '⬇️' : '⬆️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{t.description}</p>
                    <p className="text-xs text-gray-500">
                      {t.createdAt ? format(new Date(t.createdAt), 'dd MMM, HH:mm') : ''}
                      <span className="ml-2 text-gray-600">Bal: ₹{Number(t.balanceAfter || 0).toFixed(2)}</span>
                    </p>
                  </div>
                  <div className={`text-sm font-bold shrink-0 ${t.type === 'CREDIT' ? 'text-[#00a884]' : 'text-red-400'}`}>
                    {t.type === 'CREDIT' ? '+' : '-'}₹{Number(t.amount || 0).toFixed(2)}
                  </div>
                </div>
              ))}
              {hasMore && (
                <button onClick={loadMore}
                  className="w-full py-3 text-sm text-[#00a884] hover:bg-white/5 transition-colors">
                  Load more
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PayModal({ onClose, onSuccess }) {
  const [shopkeepers, setShopkeepers] = useState([])
  const [selected, setSelected] = useState(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [paying, setPaying] = useState(false)
  const [step, setStep] = useState('select') // select | confirm

  useEffect(() => {
    getShopkeepers().then(setShopkeepers).catch(() => toast.error('Could not load shops'))
  }, [])

  const handlePay = async () => {
    if (!selected || !amount || Number(amount) <= 0) {
      toast.error('Select a shop and enter amount'); return
    }
    setPaying(true)
    try {
      const updated = await payShopkeeper(selected.id, Number(amount), note)
      toast.success(`✅ Paid ₹${amount} to ${selected.shopName}!`)
      onSuccess(updated)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed')
    } finally { setPaying(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-[#1f2c34] rounded-2xl w-full max-w-md border border-white/10 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="font-bold text-white">Pay with Tokens</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {step === 'select' ? (
            <>
              <div>
                <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Select Shop</p>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {shopkeepers.map(s => (
                    <button key={s.id} onClick={() => setSelected(s)}
                      className={`p-3 rounded-xl border text-left transition-all
                        ${selected?.id === s.id
                          ? 'border-[#00a884] bg-[#00a884]/10'
                          : 'border-white/10 bg-[#2a3942] hover:border-white/20'}`}>
                      <div className="w-8 h-8 rounded-full bg-[#00a884]/20 flex items-center justify-center text-sm font-bold text-[#00a884] mb-1">
                        {s.shopName?.[0]?.toUpperCase()}
                      </div>
                      <p className="text-sm font-medium text-white truncate">{s.shopName}</p>
                      <p className="text-xs text-gray-500 truncate">{s.name}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Amount (₹)</p>
                <input type="number" className="input text-lg font-semibold py-3" placeholder="0.00"
                  min="1" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Note (optional)</p>
                <input type="text" className="input" placeholder="e.g. Groceries, Milk..."
                  value={note} onChange={e => setNote(e.target.value)} />
              </div>
              <button
                onClick={() => { if (!selected || !amount) { toast.error('Fill all fields'); return } setStep('confirm') }}
                className="btn-primary w-full py-3 text-base">
                Continue →
              </button>
            </>
          ) : (
            <>
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-[#00a884]/20 flex items-center justify-center text-3xl mx-auto mb-3">💸</div>
                <p className="text-gray-400 text-sm">Paying</p>
                <p className="text-white text-3xl font-bold mt-1">₹{amount}</p>
                <p className="text-[#00a884] text-sm mt-1">to {selected?.shopName}</p>
                {note && <p className="text-gray-500 text-xs mt-2">"{note}"</p>}
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 text-xs text-yellow-300">
                ⚠️ This action cannot be undone. Tokens will be deducted from your wallet immediately.
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setStep('select')} className="btn-secondary py-3">← Back</button>
                <button onClick={handlePay} className="btn-primary py-3" disabled={paying}>
                  {paying ? 'Processing...' : 'Confirm Pay'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
