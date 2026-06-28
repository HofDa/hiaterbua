// Provide an in-memory IndexedDB implementation so Dexie-backed repositories can
// be exercised in the Node test environment. Importing the `/auto` entry installs
// `indexedDB` / `IDBKeyRange` on globalThis before any module constructs the
// shared `db` singleton.
import 'fake-indexeddb/auto'
