import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from '@/lib/db/dexie'
import { buildSurveyAreaFeatureCollection } from '@/lib/maps/map-core'
import {
  buildActiveAssignmentsByEnclosureId,
  buildAnimalsByHerdId,
  buildAssignmentHistoryByEnclosureId,
  buildDraftFeatureCollection,
  buildEnclosureStatsById,
  buildFilteredEnclosures,
  buildHerdsById,
  buildSavedFeatureCollection,
  buildSelectedFeatureCollection,
  buildSelectedWalkPointFeatureCollection,
  buildTrackpointsFeatureCollection,
  buildWalkFeatureCollection,
  getPolygonAreaM2,
  getWalkAreaM2,
  getWalkTrackSummary,
  type DraftPoint,
  type EnclosureListFilter,
} from '@/lib/maps/live-position-map-helpers'

type WalkPoint = {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
}

type UseLivePositionMapDataArgs = {
  selectedEnclosureId: string | null
  selectedSurveyAreaId: string | null
  selectedWalkPointIndex: number | null
  enclosureListFilter: EnclosureListFilter
  draftPoints: DraftPoint[]
  walkPoints: WalkPoint[]
  editGeometryPoints: DraftPoint[]
}

export function useLivePositionMapData({
  selectedEnclosureId,
  selectedSurveyAreaId,
  selectedWalkPointIndex,
  enclosureListFilter,
  draftPoints,
  walkPoints,
  editGeometryPoints,
}: UseLivePositionMapDataArgs) {
  const enclosures = useLiveQuery(
    () => db.enclosures.orderBy('updatedAt').reverse().toArray(),
    []
  )
  const surveyAreas = useLiveQuery(
    () => db.surveyAreas.orderBy('updatedAt').reverse().toArray(),
    []
  )
  const settings = useLiveQuery(() => db.settings.get('app'), [])
  const herds = useLiveQuery(() => db.herds.orderBy('name').toArray(), [])
  const animals = useLiveQuery(() => db.animals.toArray(), [])
  const assignments = useLiveQuery(
    () => db.enclosureAssignments.orderBy('updatedAt').reverse().toArray(),
    []
  )
  const selectedTrackpoints = useLiveQuery(async () => {
    if (!selectedEnclosureId) return []
    return db.trackpoints.where('enclosureWalkId').equals(selectedEnclosureId).sortBy('seq')
  }, [selectedEnclosureId])

  const safeEnclosures = useMemo(() => enclosures ?? [], [enclosures])
  const safeSurveyAreas = useMemo(() => surveyAreas ?? [], [surveyAreas])
  const safeHerds = useMemo(() => herds ?? [], [herds])
  const safeAnimals = useMemo(() => animals ?? [], [animals])
  const safeAssignments = useMemo(() => assignments ?? [], [assignments])
  const safeSelectedTrackpoints = useMemo(
    () => selectedTrackpoints ?? [],
    [selectedTrackpoints]
  )

  const draftFeatureCollection = useMemo(
    () => buildDraftFeatureCollection(draftPoints),
    [draftPoints]
  )
  const walkFeatureCollection = useMemo(
    () => buildWalkFeatureCollection(walkPoints),
    [walkPoints]
  )
  const savedFeatureCollection = useMemo(
    () => buildSavedFeatureCollection(safeEnclosures),
    [safeEnclosures]
  )
  const surveyAreaFeatureCollection = useMemo(
    () => buildSurveyAreaFeatureCollection(safeSurveyAreas),
    [safeSurveyAreas]
  )

  const selectedEnclosure = useMemo(
    () =>
      selectedEnclosureId
        ? safeEnclosures.find((enclosure) => enclosure.id === selectedEnclosureId) ?? null
        : null,
    [safeEnclosures, selectedEnclosureId]
  )
  const selectedSurveyArea = useMemo(
    () =>
      selectedSurveyAreaId
        ? safeSurveyAreas.find((surveyArea) => surveyArea.id === selectedSurveyAreaId) ?? null
        : null,
    [safeSurveyAreas, selectedSurveyAreaId]
  )
  const selectedFeatureCollection = useMemo(
    () => buildSelectedFeatureCollection(selectedEnclosure),
    [selectedEnclosure]
  )
  const selectedTrackFeatureCollection = useMemo(
    () => buildTrackpointsFeatureCollection(safeSelectedTrackpoints),
    [safeSelectedTrackpoints]
  )
  const selectedTrackSummary = useMemo(
    () => getWalkTrackSummary(safeSelectedTrackpoints),
    [safeSelectedTrackpoints]
  )

  const herdsById = useMemo(() => buildHerdsById(safeHerds), [safeHerds])
  const animalsByHerdId = useMemo(() => buildAnimalsByHerdId(safeAnimals), [safeAnimals])
  const activeAssignmentsByEnclosureId = useMemo(
    () => buildActiveAssignmentsByEnclosureId(safeAssignments),
    [safeAssignments]
  )
  const assignmentHistoryByEnclosureId = useMemo(
    () => buildAssignmentHistoryByEnclosureId(safeAssignments),
    [safeAssignments]
  )
  const enclosureStatsById = useMemo(
    () =>
      buildEnclosureStatsById(
        safeEnclosures,
        assignmentHistoryByEnclosureId,
        herdsById,
        animalsByHerdId
      ),
    [animalsByHerdId, assignmentHistoryByEnclosureId, herdsById, safeEnclosures]
  )
  const filteredEnclosures = useMemo(
    () =>
      buildFilteredEnclosures(
        safeEnclosures,
        activeAssignmentsByEnclosureId,
        enclosureStatsById,
        enclosureListFilter
      ),
    [activeAssignmentsByEnclosureId, enclosureListFilter, enclosureStatsById, safeEnclosures]
  )

  const selectedWalkPoint = useMemo(
    () =>
      selectedWalkPointIndex !== null ? walkPoints[selectedWalkPointIndex] ?? null : null,
    [selectedWalkPointIndex, walkPoints]
  )
  const selectedWalkPointFeatureCollection = useMemo(
    () =>
      buildSelectedWalkPointFeatureCollection(selectedWalkPoint, selectedWalkPointIndex),
    [selectedWalkPoint, selectedWalkPointIndex]
  )
  const editFeatureCollection = useMemo(
    () => buildDraftFeatureCollection(editGeometryPoints),
    [editGeometryPoints]
  )
  const draftAreaM2 = useMemo(() => getPolygonAreaM2(draftPoints), [draftPoints])
  const editAreaM2 = useMemo(() => getPolygonAreaM2(editGeometryPoints), [editGeometryPoints])
  const walkAreaM2 = useMemo(() => getWalkAreaM2(walkPoints), [walkPoints])

  return {
    settings,
    safeEnclosures,
    safeSurveyAreas,
    safeHerds,
    safeAnimals,
    safeAssignments,
    safeSelectedTrackpoints,
    draftFeatureCollection,
    walkFeatureCollection,
    savedFeatureCollection,
    surveyAreaFeatureCollection,
    selectedEnclosure,
    selectedSurveyArea,
    selectedFeatureCollection,
    selectedTrackFeatureCollection,
    selectedTrackSummary,
    herdsById,
    animalsByHerdId,
    activeAssignmentsByEnclosureId,
    assignmentHistoryByEnclosureId,
    enclosureStatsById,
    filteredEnclosures,
    selectedWalkPoint,
    selectedWalkPointFeatureCollection,
    editFeatureCollection,
    draftAreaM2,
    editAreaM2,
    walkAreaM2,
  }
}
