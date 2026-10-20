// The pending conversion (Markdown and image blobs) is kept in IndexedDB until it is downloaded or
// cleared, so a reload does not lose it. A connection closed by the browser is reopened once.
const DB_NAME = 'texto-a-markdown'
const STORE = 'conversion'
const KEY = 'current'

let db = null
let opening = null

function openDB() {
  if (db) return Promise.resolve(db)
  if (opening) return opening
  opening = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE)
    }
    request.onsuccess = () => {
      const connection = request.result
      connection.onversionchange = () => {
        connection.close()
        if (db === connection) db = null
      }
      connection.onclose = () => {
        if (db === connection) db = null
      }
      db = connection
      resolve(connection)
    }
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('IndexedDB open blocked'))
  }).finally(() => {
    opening = null
  })
  return opening
}

const isClosedConnection = (error) =>
  error?.name === 'InvalidStateError' || /connection is closing|database connection.*closing/i.test(error?.message || '')

async function run(mode, operation, retry = true) {
  const connection = await openDB()
  try {
    return await new Promise((resolve, reject) => {
      const tx = connection.transaction(STORE, mode)
      const request = operation(tx.objectStore(STORE))
      tx.oncomplete = () => resolve(request.result)
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'))
      tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'))
    })
  } catch (error) {
    if (db === connection) {
      connection.close()
      db = null
    }
    if (retry && isClosedConnection(error)) return run(mode, operation, false)
    throw error
  }
}

export const loadPending = () => run('readonly', (store) => store.get(KEY))
export const savePending = (data) => run('readwrite', (store) => store.put(data, KEY))
export const clearPending = () => run('readwrite', (store) => store.delete(KEY))
