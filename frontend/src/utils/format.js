import { format, isToday, isYesterday, isThisWeek } from 'date-fns'

export function formatMessageTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return format(d, 'HH:mm')
}

export function formatRoomTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isToday(d)) return format(d, 'HH:mm')
  if (isYesterday(d)) return 'Yesterday'
  if (isThisWeek(d)) return format(d, 'EEE')
  return format(d, 'dd/MM/yy')
}

export function formatLastSeen(dateStr, online) {
  if (online) return 'online'
  if (!dateStr) return 'last seen recently'
  const d = new Date(dateStr)
  if (isToday(d)) return `last seen today at ${format(d, 'HH:mm')}`
  if (isYesterday(d)) return `last seen yesterday at ${format(d, 'HH:mm')}`
  return `last seen ${format(d, 'dd MMM')} at ${format(d, 'HH:mm')}`
}

export function formatDateDivider(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'MMMM d, yyyy')
}

export function isSameDay(a, b) {
  if (!a || !b) return false
  const da = new Date(a), db = new Date(b)
  return da.getFullYear() === db.getFullYear() &&
         da.getMonth() === db.getMonth() &&
         da.getDate() === db.getDate()
}
