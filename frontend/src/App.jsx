import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { WsProvider } from './context/WsContext'
import LoginPage from './pages/LoginPage'
import MainLayout from './components/layout/MainLayout'
import ChatPage from './pages/ChatPage'
import AnnouncementsPage from './pages/AnnouncementsPage'
import WalletPage from './pages/WalletPage'
import AdminPage from './pages/AdminPage'
import ProfilePage from './pages/ProfilePage'
import PeoplePage from './pages/PeoplePage'

function Spinner() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#111b21]">
      <div className="w-8 h-8 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.role !== 'ADMIN') return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={
        <ProtectedRoute>
          <WsProvider>
            <MainLayout />
          </WsProvider>
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/chat" replace />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="chat/:roomId" element={<ChatPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="people" element={<PeoplePage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="admin" element={
          <ProtectedRoute adminOnly>
            <AdminPage />
          </ProtectedRoute>
        } />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
