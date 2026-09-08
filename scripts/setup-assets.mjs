/**
 * Fetch the assets the pose tracker needs that can't be bundled from the npm
 * package:
 *   - `public/mediapipe/*`   — the WASM runtime files from @mediapipe/tasks-vision
 *   - `public/models/pose_landmarker_lite.task` — the pose landmarker model
 *
 * Run once with `npm run setup:assets`. The web app falls back to a CDN at
 * runtime if these files are missing, but a local copy keeps the app working
 * without a network round-trip.
 *
 * Node >= 18 is required (uses global fetch).
 */
import { mkdir, copyFile } from "node:fs/promises"
import { writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const wasmSrc = join(
  root,
  "node_modules",
  "@mediapipe",
  "tasks-vision",
  "wasm"
)
const wasmDest = join(root, "public", "mediapipe")
const modelDest = join(root, "public", "models")

const WASM_FILES = [
  "vision_wasm_internal.js",
  "vision_wasm_internal.wasm",
  "vision_wasm_nosimd_internal.js",
  "vision_wasm_nosimd_internal.wasm",
]

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"

async function main() {
  await mkdir(wasmDest, { recursive: true })
  await mkdir(modelDest, { recursive: true })

  // 1. Copy WASM runtime files
  let copied = 0
  for (const f of WASM_FILES) {
    try {
      await copyFile(join(wasmSrc, f), join(wasmDest, f))
      copied++
      console.log(`copied mediapipe/${f}`)
    } catch (err) {
      console.warn(`WARN: could not copy ${f}: ${err.message}`)
    }
  }
  if (copied === 0) {
    console.warn(
      "WARN: no WASM files copied — is @mediapipe/tasks-vision installed?"
    )
  }

  // 2. Download pose landmarker model
  const modelPath = join(modelDest, "pose_landmarker_lite.task")
  const res = await fetch(MODEL_URL)
  if (!res.ok) {
    console.warn(
      `WARN: model download failed (HTTP ${res.status}) — ` +
        "the runtime CDN fallback will be used."
    )
    process.exit(1)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(modelPath, buf)
  console.log(`downloaded models/pose_landmarker_lite.task (${buf.length} bytes)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})