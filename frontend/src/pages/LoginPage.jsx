import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { login } from '../api/services'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login: setAuth } = useAuth()
  const [form, setForm] = useState({ phone: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await login(form.phone, form.password)
      setAuth(data.token, data.user)
      toast.success(`Welcome, ${data.user.name}!`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#111b21] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-[#00a884] rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-[#00a884]/30">
            <span className="text-4xl">🏘️</span>
          </div>
          <h1 className="text-3xl font-light text-white tracking-wide">LocalityApp</h1>
          <p className="text-gray-500 text-sm mt-2">Your neighbourhood, connected</p>
        </div>

        <div className="bg-[#1f2c34] rounded-2xl p-6 shadow-2xl border border-white/5 space-y-4">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider mb-1.5 block">Phone Number</label>
            <input type="tel" className="input py-3" placeholder="Enter your phone number"
              value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} required />
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider mb-1.5 block">Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} className="input py-3 pr-10"
                placeholder="Enter your password"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 text-sm">
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <button type="button" onClick={handleSubmit}
            disabled={loading || !form.phone || !form.password}
            className="btn-primary w-full py-3 text-base rounded-xl mt-2">
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              : 'Sign In'}
          </button>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Contact your locality admin to get access
        </p>
        <p className="text-center text-xs text-gray-700 mt-2">
          Runs entirely on your local network · No internet required
        </p>
      </div>
    </div>
  )
}
