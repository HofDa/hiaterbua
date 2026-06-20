/**
 * Throws `message` when a Dexie `update` affected no rows — i.e. the record was
 * gone by the time the write ran. Inside a transaction the throw rolls it back.
 */
export function assertUpdated(updatedCount: number, message: string): void {
  if (updatedCount === 0) {
    throw new Error(message)
  }
}
