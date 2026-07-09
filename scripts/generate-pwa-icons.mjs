// Generates the committed PWA icon artifacts from public/icon-512.png:
// - public/icon-maskable-192.png / public/icon-maskable-512.png:
//   full-bleed theme-color squares with the source icon scaled to ~80%,
//   so Android adaptive-icon masks never clip the artwork (safe zone).
// - public/apple-touch-icon.png (180x180, opaque):
//   iOS ignores transparency, so the icon sits on the same backdrop.
//
// Run manually via `npm run icons:generate` and commit the PNGs.
// Intentionally NOT part of the build pipeline.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = path.join(rootDir, 'public')
const sourceIcon = path.join(publicDir, 'icon-512.png')

// Keep in sync with `theme_color` in public/manifest.webmanifest.
const BACKDROP = '#163d2f'
// Scale of the artwork relative to the full-bleed square. ~80% keeps the
// icon inside the maskable safe zone (a centered circle of 80% diameter).
const ARTWORK_SCALE = 0.8

async function generateIcon({ size, outputName }) {
  const artworkSize = Math.round(size * ARTWORK_SCALE)
  const artwork = await sharp(sourceIcon)
    .resize(artworkSize, artworkSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  const outputPath = path.join(publicDir, outputName)
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: BACKDROP,
    },
  })
    .composite([{ input: artwork, gravity: 'center' }])
    .removeAlpha()
    .png()
    .toFile(outputPath)

  console.log(`Wrote ${path.relative(rootDir, outputPath)} (${size}x${size})`)
}

await generateIcon({ size: 192, outputName: 'icon-maskable-192.png' })
await generateIcon({ size: 512, outputName: 'icon-maskable-512.png' })
await generateIcon({ size: 180, outputName: 'apple-touch-icon.png' })
