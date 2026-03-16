#!/usr/bin/env node

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

function printUsage() {
  console.error(
    'Usage: node scripts/generate-survey-areas-from-csv.mjs --out <output.geojson> <input1.csv> [input2.csv ...]'
  )
}

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function parseCoordinate(value) {
  const normalized = value.trim()
  if (!normalized || normalized.toLowerCase() === 'fehlt') {
    return null
  }

  const numeric = Number(normalized.replace(',', '.'))
  return Number.isFinite(numeric) ? numeric : null
}

function parseCsvLine(line) {
  const parts = line.split(',')
  if (parts.length < 4) {
    return null
  }

  return {
    rawIndex: parts[0].trim(),
    rawName: parts.slice(1, -2).join(',').trim(),
    lat: parseCoordinate(parts.at(-2) ?? ''),
    lon: parseCoordinate(parts.at(-1) ?? ''),
  }
}

function getBaseName(rawName) {
  return rawName.replace(/\s+(ro|lu)\s*$/i, '').trim()
}

function getCorner(rawName) {
  const match = rawName.match(/\s+(ro|lu)\s*$/i)
  return match ? match[1].toUpperCase() : null
}

async function buildFeatureCollection(inputPaths) {
  const groups = new Map()
  const warnings = []
  const generatedAt = new Date().toISOString()

  for (const inputPath of inputPaths) {
    const sourceName = path.basename(inputPath, path.extname(inputPath))
    const sourceSlug = slugify(sourceName)
    const content = await readFile(inputPath, 'utf8')
    const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim().length > 0)

    for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
      const parsed = parseCsvLine(lines[lineIndex])
      if (!parsed || !parsed.rawName) {
        warnings.push(`${sourceName}: Zeile ${lineIndex + 1} konnte nicht gelesen werden.`)
        continue
      }

      const baseName = getBaseName(parsed.rawName)
      const corner = getCorner(parsed.rawName)
      const groupKey = `${sourceSlug}:${baseName.toLowerCase()}`

      const current =
        groups.get(groupKey) ??
        {
          id: `survey-${sourceSlug}-${slugify(baseName)}`,
          name: baseName,
          sourceName,
          createdAt: generatedAt,
          updatedAt: generatedAt,
          sourceRows: [],
          points: [],
        }

      current.sourceRows.push({
        row: lineIndex + 1,
        rawIndex: parsed.rawIndex || null,
        rawName: parsed.rawName,
        corner,
        lat: parsed.lat,
        lon: parsed.lon,
      })

      if (parsed.lat === null || parsed.lon === null) {
        warnings.push(`${sourceName}: "${parsed.rawName}" hat unvollstaendige Koordinaten und wird nur als Hinweis gespeichert.`)
      } else {
        current.points.push({
          lat: parsed.lat,
          lon: parsed.lon,
          corner,
        })
      }

      groups.set(groupKey, current)
    }
  }

  const features = []

  for (const group of groups.values()) {
    if (group.points.length < 2) {
      warnings.push(`${group.sourceName}: "${group.name}" wurde uebersprungen, weil weniger als zwei gueltige Eckpunkte vorhanden sind.`)
      continue
    }

    const lats = group.points.map((point) => point.lat)
    const lons = group.points.map((point) => point.lon)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLon = Math.min(...lons)
    const maxLon = Math.max(...lons)

    if (minLat === maxLat || minLon === maxLon) {
      warnings.push(`${group.sourceName}: "${group.name}" ergibt kein Flaechenrechteck und wurde uebersprungen.`)
      continue
    }

    features.push({
      type: 'Feature',
      properties: {
        id: group.id,
        name: group.name,
        description: `Rechteck aus zwei CSV-Eckpunkten (${group.points
          .map((point) => point.corner ?? '?')
          .join(', ')}) erzeugt.`,
        source: group.sourceName,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [minLon, minLat],
          [maxLon, minLat],
          [maxLon, maxLat],
          [minLon, maxLat],
          [minLon, minLat],
        ]],
      },
    })
  }

  features.sort((left, right) => {
    const bySource = String(left.properties.source).localeCompare(String(right.properties.source))
    if (bySource !== 0) {
      return bySource
    }

    return String(left.properties.name).localeCompare(String(right.properties.name), 'de')
  })

  return {
    collection: {
      type: 'FeatureCollection',
      name: 'survey-areas',
      generatedAt,
      featureCount: features.length,
      warnings,
      features,
    },
    warnings,
  }
}

async function main() {
  const args = process.argv.slice(2)
  const outIndex = args.indexOf('--out')

  if (outIndex === -1 || outIndex === args.length - 1) {
    printUsage()
    process.exitCode = 1
    return
  }

  const outputPath = path.resolve(args[outIndex + 1])
  const inputPaths = args.filter((_, index) => index !== outIndex && index !== outIndex + 1)

  if (inputPaths.length === 0) {
    printUsage()
    process.exitCode = 1
    return
  }

  const resolvedInputPaths = inputPaths.map((inputPath) => path.resolve(inputPath))
  const { collection, warnings } = await buildFeatureCollection(resolvedInputPaths)

  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(collection, null, 2)}\n`, 'utf8')

  console.error(`GeoJSON geschrieben: ${outputPath}`)
  console.error(`Features: ${collection.featureCount}`)

  if (warnings.length > 0) {
    console.error('Hinweise:')
    for (const warning of warnings) {
      console.error(`- ${warning}`)
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
