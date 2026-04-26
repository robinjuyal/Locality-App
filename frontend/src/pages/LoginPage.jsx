import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { login } from '../api/services'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login: setAuth } = useAuth()
  const [form, setForm] = useState({ phone: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await login(form.phone, form.password)
      setAuth(data.token, data.user)
      toast.success(`Welcome, ${data.user.name}!`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🏘️</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">LocalityApp</h1>
          <p className="text-gray-500 text-sm mt-1">Your community, connected</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="tel"
              className="input"
              placeholder="Enter your phone number"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              className="input"
              placeholder="Enter your password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full py-3 text-base" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Contact your locality admin to get access
        </p>
      </div>
    </div>
  )
}
