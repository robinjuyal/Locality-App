import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useWs } from '../../context/WsContext'

const navItems = [
  { to: '/chat',          icon: '💬', label: 'Chats' },
  { to: '/announcements', icon: '📢', label: 'Notices' },
  { to: '/wallet',        icon: '💰', label: 'Wallet' },
  { to: '/people',        icon: '👥', label: 'People' },
  { to: '/profile',       icon: '👤', label: 'Profile' },
]

export default function MainLayout() {
  const { user } = useAuth()
  const { connected } = useWs()

  const allItems = user?.role === 'ADMIN'
    ? [...navItems, { to: '/admin', icon: '⚙️', label: 'Admin' }]
    : navItems

  return (
    <div className="flex h-screen overflow-hidden bg-[#111b21]">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex flex-col w-16 bg-[#202c33] border-r border-white/5 shrink-0 items-center py-4 gap-2">
        <div className="w-9 h-9 bg-[#00a884] rounded-xl flex items-center justify-center text-lg mb-2">🏘️</div>

        <div className="flex-1 flex flex-col gap-1 w-full px-2">
          {allItems.map(item => (
            <NavLink key={item.to} to={item.to} title={item.label}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl text-xs transition-colors
                 ${isActive ? 'bg-[#00a884]/20 text-[#00a884]' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}>
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px]">{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="mt-auto flex flex-col items-center gap-2 w-full px-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-[#00a884]' : 'bg-gray-500'}`} title={connected ? 'Connected' : 'Connecting...'} />
          <div className="w-9 h-9 rounded-full bg-[#2a3942] flex items-center justify-center font-bold text-[#00a884] text-sm overflow-hidden cursor-pointer">
            {user?.profilePic
              ? <img src={user.profilePic} alt="" className="w-full h-full object-cover" />
              : user?.name?.[0]?.toUpperCase()}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </main>

      {/* Bottom nav — mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#202c33] border-t border-white/5 flex z-50 safe-area-inset-bottom">
        {allItems.map(item => (
          <NavLink key={item.to} to={item.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-xs transition-colors
               ${isActive ? 'text-[#00a884]' : 'text-gray-500'}`}>
            <span className="text-xl">{item.icon}</span>
            <span className="mt-0.5">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
