import { db } from '@/lib/db/dexie'
import type { SurveyArea } from '@/types/domain'

// ---------------------------------------------------------------------------
// Reads
//
// Survey areas are imported wholesale from a GeoJSON bundle and never edited in
// the app, so there is no write side here — the import/export layer owns that.
// ---------------------------------------------------------------------------

/**
 * Every survey area in id order. Callers that display them should still run the
 * result through `sortSurveyAreasByImportOrder`, which applies the numeric-aware
 * collation the plot ids need.
 */
export function listSurveyAreas(): Promise<SurveyArea[]> {
  return db.surveyAreas.orderBy('id').toArray()
}
