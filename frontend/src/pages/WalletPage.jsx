import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getMyWallet, getTransactions, getShopkeepers, payShopkeeper, getShopkeeperWallet } from '../api/services'
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

  useEffect(() => {
    Promise.all([
      isShopkeeper ? getShopkeeperWallet() : getMyWallet(),
      getTransactions(0)
    ]).then(([w, t]) => {
      setWallet(w)
      setTxns(t || [])
    }).catch(() => toast.error('Failed to load wallet'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex-1 flex items-center justify-center text-gray-400">Loading wallet...</div>

  return (
    <div className="flex flex-col h-full overflow-hidden pb-14 md:pb-0">
      <div className="px-5 py-4 border-b border-gray-200 bg-white">
        <h2 className="font-bold text-gray-900 text-lg">Wallet</h2>
        <p className="text-xs text-gray-500">1 Token = ₹1</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Balance card */}
        <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-6 text-white">
          <p className="text-primary-200 text-sm mb-1">Token Balance</p>
          <p className="text-4xl font-bold">₹{wallet?.balance?.toFixed(2) || '0.00'}</p>
          <p className="text-primary-200 text-xs mt-1">{wallet?.balance?.toFixed(0)} tokens available</p>

          {isShopkeeper && (
            <div className="mt-4 pt-4 border-t border-primary-500 grid grid-cols-2 gap-3">
              <div>
                <p className="text-primary-200 text-xs">Total Earned</p>
                <p className="text-lg font-semibold">₹{wallet?.totalEarned?.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-primary-200 text-xs">Pending Settlement</p>
                <p className="text-lg font-semibold">₹{wallet?.pendingSettlement?.toFixed(2)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          {!isShopkeeper && (
            <button onClick={() => setShowPay(true)}
              className="card p-4 text-center hover:shadow-md transition-shadow">
              <p className="text-2xl mb-1">💸</p>
              <p className="text-sm font-medium text-gray-900">Pay Shop</p>
              <p className="text-xs text-gray-500">Use tokens at shops</p>
            </button>
          )}
          {isShopkeeper && (
            <button onClick={() => setShowQR(!showQR)}
              className="card p-4 text-center hover:shadow-md transition-shadow">
              <p className="text-2xl mb-1">📲</p>
              <p className="text-sm font-medium text-gray-900">My QR Code</p>
              <p className="text-xs text-gray-500">Show to customers</p>
            </button>
          )}
          <div className="card p-4 text-center">
            <p className="text-2xl mb-1">📊</p>
            <p className="text-sm font-medium text-gray-900">{txns.length} Transactions</p>
            <p className="text-xs text-gray-500">All time</p>
          </div>
        </div>

        {/* QR Code for shopkeeper */}
        {isShopkeeper && showQR && (
          <div className="card p-6 flex flex-col items-center gap-3">
            <p className="font-semibold text-gray-900">Scan to Pay — {user?.shopName}</p>
            <QRCodeSVG
              value={JSON.stringify({ shopkeeperId: user?.id, shopName: user?.shopName })}
              size={180}
              bgColor="#ffffff"
              fgColor="#1d4ed8"
            />
            <p className="text-xs text-gray-500">Customer scans this to pay you in tokens</p>
          </div>
        )}

        {/* Pay modal */}
        {showPay && (
          <PayModal onClose={() => setShowPay(false)}
            onSuccess={(newWallet) => { setWallet(newWallet); setShowPay(false) }} />
        )}

        {/* Transaction history */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Transaction History</h3>
          </div>
          {txns.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">No transactions yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {txns.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm
                    ${t.type === 'CREDIT' ? 'bg-green-100' : 'bg-red-100'}`}>
                    {t.type === 'CREDIT' ? '↓' : '↑'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{t.description}</p>
                    <p className="text-xs text-gray-400">
                      {t.createdAt ? format(new Date(t.createdAt), 'dd MMM, HH:mm') : ''}
                    </p>
                  </div>
                  <div className={`text-sm font-semibold ${t.type === 'CREDIT' ? 'text-green-600' : 'text-red-500'}`}>
                    {t.type === 'CREDIT' ? '+' : '-'}₹{t.amount?.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PayModal({ onClose, onSuccess }) {
  const [shopkeepers, setShopkeepers] = useState([])
  const [selectedShop, setSelectedShop] = useState(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    getShopkeepers().then(setShopkeepers).catch(() => toast.error('Could not load shops'))
  }, [])

  const handlePay = async () => {
    if (!selectedShop || !amount || Number(amount) <= 0) {
      toast.error('Select a shop and enter amount')
      return
    }
    setPaying(true)
    try {
      const updated = await payShopkeeper(selectedShop.id, Number(amount), note)
      toast.success(`Paid ₹${amount} to ${selectedShop.shopName}!`)
      onSuccess(updated)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed')
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-gray-900">Pay with Tokens</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Shop</label>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
            {shopkeepers.map(s => (
              <button key={s.id}
                onClick={() => setSelectedShop(s)}
                className={`p-3 rounded-xl border text-left transition-colors
                  ${selectedShop?.id === s.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <p className="text-sm font-medium text-gray-900 truncate">{s.shopName}</p>
                <p className="text-xs text-gray-500 truncate">{s.name}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
          <input type="number" className="input" placeholder="0.00" min="1"
            value={amount} onChange={e => setAmount(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
          <input type="text" className="input" placeholder="e.g. Groceries"
            value={note} onChange={e => setNote(e.target.value)} />
        </div>

        <button onClick={handlePay} className="btn-primary w-full py-3" disabled={paying}>
          {paying ? 'Processing...' : `Pay ₹${amount || '0'} →`}
        </button>
      </div>
    </div>
  )
}
