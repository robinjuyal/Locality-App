import { openDB } from 'idb'

const DB_NAME = 'locality-app'
const DB_VERSION = 1

let dbPromise

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('messages')) {
          const store = db.createObjectStore('messages', { keyPath: 'id' })
          store.createIndex('roomId', 'roomId')
        }
        if (!db.objectStoreNames.contains('rooms')) {
          db.createObjectStore('rooms', { keyPath: 'id' })
        }
      }
    })
  }
  return dbPromise
}

export async function cacheMessages(roomId, messages) {
  try {
    const db = await getDb()
    const tx = db.transaction('messages', 'readwrite')
    for (const msg of messages) {
      await tx.store.put({ ...msg, roomId })
    }
    await tx.done
  } catch (e) { console.warn('Cache write failed', e) }
}

export async function getCachedMessages(roomId) {
  try {
    const db = await getDb()
    return await db.getAllFromIndex('messages', 'roomId', roomId)
  } catch (e) { return [] }
}

export async function cacheRooms(rooms) {
  try {
    const db = await getDb()
    const tx = db.transaction('rooms', 'readwrite')
    for (const room of rooms) await tx.store.put(room)
    await tx.done
  } catch (e) { console.warn('Cache write failed', e) }
}

export async function getCachedRooms() {
  try {
    const db = await getDb()
    return await db.getAll('rooms')
  } catch (e) { return [] }
}

export async function updateCachedMessage(message) {
  try {
    const db = await getDb()
    const existing = await db.get('messages', message.id)
    if (existing) await db.put('messages', { ...existing, ...message })
    else await db.put('messages', { ...message, roomId: message.roomId })
  } catch (e) {}
}
