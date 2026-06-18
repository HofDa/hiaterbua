// Central seam for error observability. Today it just writes to the console so
// failures that are otherwise swallowed (graceful-degradation catches in the
// storage/persistence layer) leave a diagnosable trace; swap the body for a
// telemetry sink later without touching call sites.
export function logError(context: string, error: unknown) {
  console.error(`[pastore] ${context}`, error)
}
