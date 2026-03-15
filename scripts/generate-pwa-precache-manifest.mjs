import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const nextDir = path.join(projectRoot, '.next')
const publicDir = path.join(projectRoot, 'public')
const outputFile = path.join(publicDir, 'pwa-precache-manifest.js')

async function main() {
  const [buildId, prerenderManifest, nextStaticFiles, publicFiles] = await Promise.all([
    readText(path.join(nextDir, 'BUILD_ID')),
    readJson(path.join(nextDir, 'prerender-manifest.json')),
    listFiles(path.join(nextDir, 'static')),
    listFiles(publicDir),
  ])

  const routes = Object.entries(prerenderManifest.routes)
    .map(([routePath, routeConfig]) => ({
      path: routePath,
      dataRoute: routeConfig.dataRoute ?? null,
    }))
    .sort((left, right) => left.path.localeCompare(right.path))

  const urls = new Set()

  for (const route of routes) {
    urls.add(route.path)
  }

  for (const filePath of nextStaticFiles) {
    urls.add(`/_next/static/${toPosix(path.relative(path.join(nextDir, 'static'), filePath))}`)
  }

  for (const filePath of publicFiles) {
    const relativePath = toPosix(path.relative(publicDir, filePath))

    if (
      relativePath === 'pwa-precache-manifest.js' ||
      relativePath === 'sw.js' ||
      relativePath.startsWith('sw/')
    ) {
      continue
    }

    urls.add(`/${relativePath}`)
  }

  const manifest = {
    version: buildId.trim(),
    routes,
    urls: Array.from(urls).sort(),
  }

  const output = `self.__PWA_PRECACHE_MANIFEST = ${JSON.stringify(manifest, null, 2)};\n`
  await fs.writeFile(outputFile, output, 'utf8')
}

async function readText(filePath) {
  return fs.readFile(filePath, 'utf8')
}

async function readJson(filePath) {
  return JSON.parse(await readText(filePath))
}

async function listFiles(directoryPath) {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directoryPath, entry.name)

      if (entry.isDirectory()) {
        return listFiles(entryPath)
      }

      if (entry.isFile()) {
        return [entryPath]
      }

      return []
    })
  )

  return files.flat()
}

function toPosix(filePath) {
  return filePath.split(path.sep).join('/')
}

main().catch((error) => {
  console.error('Failed to generate PWA precache manifest.')
  console.error(error)
  process.exitCode = 1
})
