// Generates the committed PWA icon artifacts from public/icon-512.png:
// - public/icon-maskable-192.png / public/icon-maskable-512.png:
//   full-bleed squares for Android adaptive-icon masks (safe zone).
// - public/apple-touch-icon.png (180x180, opaque):
//   iOS ignores transparency, so the icon needs a full-bleed backdrop.
//
// The source artwork ships with a decorative 1px frame line on a light
// backdrop. Compositing the whole file would show that frame inside the
// adaptive-icon mask, so the artwork is cropped out from inside the frame
// and re-centered on a full-bleed square of the source's own backdrop
// color — no frame, no color seam.
//
// Run manually via `npm run icons:generate` and commit the PNGs.
// Intentionally NOT part of the build pipeline.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = path.join(rootDir, 'public')
const sourceIcon = path.join(publicDir, 'icon-512.png')

// Backdrop color of the source artwork (sampled from icon-512.png).
const BACKDROP = { r: 248, g: 250, b: 252 }
// The source's frame line sits at ~41px/470px; crop safely inside it.
const FRAME_INSET = 44
// Largest artwork dimension relative to the full-bleed square. 0.6 keeps
// the whole artwork inside the maskable safe zone (a centered circle of
// 80% diameter), including its corners.
const ARTWORK_SCALE = 0.6

async function extractArtwork() {
  const { width, height } = await sharp(sourceIcon).metadata()
  // sharp applies trim before extract within a single pipeline, so the
  // frame crop and the trim-to-artwork need two passes.
  const insideFrame = await sharp(sourceIcon)
    .extract({
      left: FRAME_INSET,
      top: FRAME_INSET,
      width: width - 2 * FRAME_INSET,
      height: height - 2 * FRAME_INSET,
    })
    .png()
    .toBuffer()

  return sharp(insideFrame)
    .trim({ background: BACKDROP, threshold: 12 })
    .png()
    .toBuffer()
}

async function generateIcon(artwork, { size, outputName }) {
  const artworkSize = Math.round(size * ARTWORK_SCALE)
  const scaledArtwork = await sharp(artwork)
    .resize(artworkSize, artworkSize, { fit: 'inside' })
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
    .composite([{ input: scaledArtwork, gravity: 'center' }])
    .removeAlpha()
    .png()
    .toFile(outputPath)

  console.log(`Wrote ${path.relative(rootDir, outputPath)} (${size}x${size})`)
}

const artwork = await extractArtwork()
await generateIcon(artwork, { size: 192, outputName: 'icon-maskable-192.png' })
await generateIcon(artwork, { size: 512, outputName: 'icon-maskable-512.png' })
await generateIcon(artwork, { size: 180, outputName: 'apple-touch-icon.png' })
