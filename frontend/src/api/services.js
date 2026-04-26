import api from './axios'

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = (phone, password) =>
  api.post('/api/auth/login', { phone, password }).then(r => r.data.data)

// ── Users ─────────────────────────────────────────────────────────────────────
export const getMe = () => api.get('/api/users/me').then(r => r.data.data)
export const getAllUsers = () => api.get('/api/users').then(r => r.data.data)
export const getShopkeepers = () => api.get('/api/users/shopkeepers').then(r => r.data.data)
export const uploadAvatar = (file) => {
  const fd = new FormData(); fd.append('file', file)
  return api.post('/api/users/me/avatar', fd).then(r => r.data.data)
}
export const updateProfile = (params) =>
  api.patch('/api/users/me', null, { params }).then(r => r.data.data)

// ── Chat ──────────────────────────────────────────────────────────────────────
export const getRooms = () => api.get('/api/chat/rooms').then(r => r.data.data)
export const openDirectRoom = (targetUserId) =>
  api.post(`/api/chat/rooms/direct/${targetUserId}`).then(r => r.data.data)
export const getMessages = (roomId, page = 0, size = 50) =>
  api.get(`/api/chat/rooms/${roomId}/messages`, { params: { page, size } }).then(r => r.data.data)
export const markRead = (roomId) => api.post(`/api/chat/rooms/${roomId}/read`)
export const uploadMedia = (file) => {
  const fd = new FormData(); fd.append('file', file)
  return api.post('/api/chat/upload', fd).then(r => r.data.data)
}

// ── Announcements ─────────────────────────────────────────────────────────────
export const getAnnouncements = (page = 0) =>
  api.get('/api/announcements', { params: { page, size: 20 } }).then(r => r.data.data)
export const getUrgentAnnouncements = () =>
  api.get('/api/announcements/urgent').then(r => r.data.data)
export const createAnnouncement = (data) =>
  api.post('/api/announcements', data).then(r => r.data.data)
export const deleteAnnouncement = (id) => api.delete(`/api/announcements/${id}`)

// ── Wallet ─────────────────────────────────────────────────────────────────────
export const getMyWallet = () => api.get('/api/wallet/me').then(r => r.data.data)
export const getTransactions = (page = 0) =>
  api.get('/api/wallet/transactions', { params: { page, size: 20 } }).then(r => r.data.data)
export const payShopkeeper = (shopkeeperId, amount, note) =>
  api.post('/api/wallet/pay', { shopkeeperId, amount, note }).then(r => r.data.data)
export const getShopkeeperWallet = () =>
  api.get('/api/wallet/shopkeeper/me').then(r => r.data.data)

// ── Admin ─────────────────────────────────────────────────────────────────────
export const registerUser = (data) =>
  api.post('/api/admin/users/register', data).then(r => r.data.data)
export const adminGetAllUsers = () =>
  api.get('/api/admin/users').then(r => r.data.data)
export const toggleUser = (userId) =>
  api.patch(`/api/admin/users/${userId}/toggle`).then(r => r.data.data)
export const adminTopUp = (userId, amount) =>
  api.post('/api/admin/wallet/topup', { userId, amount }).then(r => r.data.data)
export const getPendingSettlements = () =>
  api.get('/api/admin/settlements/pending').then(r => r.data.data)
export const markSettlementPaid = (id, note) =>
  api.patch(`/api/admin/settlements/${id}/paid`, null, { params: { note } }).then(r => r.data.data)
export const triggerSettlement = () => api.post('/api/admin/settlements/run')
