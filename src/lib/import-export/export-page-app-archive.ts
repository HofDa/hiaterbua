import JSZip from 'jszip'
import { db } from '@/lib/db/dexie'
import { listAllAnimals } from '@/lib/db/repositories/animals'
import { listAllEnclosures } from '@/lib/db/repositories/enclosures'
import { listAllHerds } from '@/lib/db/repositories/herds'
import { listAllSessionEvents, listAllSessions } from '@/lib/db/repositories/sessions'
import { listAllWorkEvents, listAllWorkSessions } from '@/lib/db/repositories/work-sessions'
import {
  buildFeatureCollection,
} from '@/lib/import-export/file-formats'
import { buildAppExportArtifacts } from '@/lib/import-export/export-page-app-archive-builders'
import { APP_TITLE, APP_VERSION } from '@/lib/app-metadata'

export async function buildAppExportArchive() {
  const [
    herds,
    animals,
    enclosures,
    surveyAreas,
    enclosureAssignments,
    sessions,
    trackpoints,
    events,
    workSessions,
    workEvents,
    settings,
  ] = await Promise.all([
    listAllHerds(),
    listAllAnimals(),
    listAllEnclosures(),
    db.surveyAreas.toArray(),
    db.enclosureAssignments.toArray(),
    listAllSessions(),
    db.trackpoints.toArray(),
    listAllSessionEvents(),
    listAllWorkSessions(),
    listAllWorkEvents(),
    db.settings.toArray(),
  ])
  const {
    appData,
    herdExport,
    enclosureFeatures,
    surveyAreaFeatures,
    grazingSessionFeatures,
    grazingTrackpointFeatures,
    enclosureWalkTrackpointFeatures,
    sessionEventFeatures,
    grazingGpx,
    enclosureWalkGpx,
  } = buildAppExportArtifacts({
    herds,
    animals,
    enclosures,
    surveyAreas,
    enclosureAssignments,
    sessions,
    trackpoints,
    events,
    workSessions,
    workEvents,
    settings,
  })

  const zip = new JSZip()
  zip.file(
    'README.txt',
    [
      `${APP_TITLE} Export`,
      '',
      'spatial/enclosures.geojson: Pferche als Polygone',
      'spatial/survey_areas.geojson: Untersuchungsflächen als Polygone',
      'spatial/grazing_sessions.geojson: Geführte Weidegänge als Linien',
      'spatial/grazing_trackpoints.geojson: Trackpunkte der Weidegänge',
      'spatial/session_events.geojson: Ereignisse der Weidegänge als Punkte',
      'spatial/enclosure_walk_trackpoints.geojson: Trackpunkte der abgelaufenen Pferche',
      'gpx/grazing_sessions.gpx: Weidegänge als GPX',
      'gpx/enclosure_walks.gpx: Pferch-Walks als GPX',
      'herds/herds.json: Herden mit Tieren, Belegungen, Sitzungen und Arbeitseinsätzen',
      'app-data.json: übrige App-Daten für Import/Archiv',
      '',
      'GeoPackage ist aktuell noch nicht enthalten.',
    ].join('\n')
  )
  zip.file('app-data.json', JSON.stringify(appData, null, 2))
  zip.file(
    'spatial/enclosures.geojson',
    JSON.stringify(buildFeatureCollection(enclosureFeatures), null, 2)
  )
  zip.file(
    'spatial/survey_areas.geojson',
    JSON.stringify(buildFeatureCollection(surveyAreaFeatures), null, 2)
  )
  zip.file(
    'spatial/grazing_sessions.geojson',
    JSON.stringify(buildFeatureCollection(grazingSessionFeatures), null, 2)
  )
  zip.file(
    'spatial/grazing_trackpoints.geojson',
    JSON.stringify(buildFeatureCollection(grazingTrackpointFeatures), null, 2)
  )
  zip.file(
    'spatial/session_events.geojson',
    JSON.stringify(buildFeatureCollection(sessionEventFeatures), null, 2)
  )
  zip.file(
    'spatial/enclosure_walk_trackpoints.geojson',
    JSON.stringify(buildFeatureCollection(enclosureWalkTrackpointFeatures), null, 2)
  )
  zip.file('gpx/grazing_sessions.gpx', grazingGpx)
  zip.file('gpx/enclosure_walks.gpx', enclosureWalkGpx)
  zip.file('herds/herds.json', JSON.stringify(herdExport, null, 2))

  return {
    blob: await zip.generateAsync({ type: 'blob' }),
    filename: `pastore-${APP_VERSION}-export-${new Date().toISOString().slice(0, 10)}.zip`,
  }
}
