import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { updateProfile, uploadAvatar } from '../api/services'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { user, setUser, logout } = useAuth()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: user?.name || '', houseNumber: user?.houseNumber || '' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await updateProfile(form)
      setUser(updated)
      setEditing(false)
      toast.success('Profile updated!')
    } catch { toast.error('Failed to update') }
    finally { setSaving(false) }
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const updated = await uploadAvatar(file)
      setUser(updated)
      toast.success('Avatar updated!')
    } catch { toast.error('Upload failed') }
    finally { setUploading(false); e.target.value = '' }
  }

  const roleColors = { ADMIN: 'text-purple-600', RESIDENT: 'text-blue-600', SHOPKEEPER: 'text-green-600' }

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-14 md:pb-0">
      <div className="px-5 py-4 border-b border-gray-200 bg-white">
        <h2 className="font-bold text-gray-900 text-lg">Profile</h2>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Avatar */}
        <div className="card p-6 flex flex-col items-center gap-3">
          <label className="cursor-pointer relative group">
            <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center text-4xl font-bold text-primary-600 overflow-hidden">
              {user?.profilePic
                ? <img src={user.profilePic} alt="" className="w-full h-full object-cover" />
                : user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="absolute inset-0 bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs">
              {uploading ? 'Uploading...' : 'Change'}
            </div>
            <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </label>

          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">{user?.name}</p>
            <p className={`text-sm font-medium capitalize ${roleColors[user?.role]}`}>
              {user?.role?.toLowerCase()}
            </p>
            {user?.shopName && <p className="text-sm text-gray-500">{user.shopName}</p>}
          </div>
        </div>

        {/* Info */}
        <div className="card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Details</h3>
            <button onClick={() => setEditing(!editing)} className="text-sm text-primary-600 font-medium">
              {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Phone', value: user?.phone, editable: false },
              { label: 'Name', key: 'name', editable: true },
              { label: 'House Number', key: 'houseNumber', editable: true },
            ].map(field => (
              <div key={field.label}>
                <p className="text-xs text-gray-500 mb-0.5">{field.label}</p>
                {editing && field.editable ? (
                  <input className="input text-sm" value={form[field.key]}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))} />
                ) : (
                  <p className="text-sm text-gray-900">{field.value ?? form[field.key] ?? '—'}</p>
                )}
              </div>
            ))}
          </div>

          {editing && (
            <button onClick={handleSave} className="btn-primary w-full" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>

        {/* Logout */}
        <button onClick={logout} className="btn-danger w-full">Sign Out</button>
      </div>
    </div>
  )
}
