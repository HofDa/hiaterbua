/**
 * Asks the grazing screen to show the Verlauf (history) section — e.g. from the
 * "Weidegang gespeichert" card. The mobile section switch is local UI state of
 * the screen component, so a window event decouples it from the store-driven
 * management panel.
 */
export const GRAZING_SHOW_HISTORY_EVENT = 'pastore:grazing-show-history'

export function requestGrazingHistoryView() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(GRAZING_SHOW_HISTORY_EVENT))
}
