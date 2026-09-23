# Build the StreetProof web app (frontend)

You are building the complete frontend for **StreetProof**, a web app that turns a phone video of a street into a speed study a city can trust. A Java Spring Boot backend already exists and does all the computer vision. Your job is the browser app: a clean product flow plus one "wow" 3D view. Read this whole document before writing code. Follow the API contract exactly. Do not invent endpoints or fields.

## 1. What the product does (so the UI tells the right story)

Residents who think cars drive too fast on their street film it with a phone. StreetProof:

1. sends every frame to the **Livepeer Agent** network, which runs the `yolo-detect` car detector,
2. tracks each vehicle across frames and measures its speed,
3. runs a **refusal gate**: a speed is only reported if it is *proven* (enough clean frames, steady straight-line motion, confident detection, a physically plausible speed). Anything else is **refused, with the reason shown**,
4. produces a study: the 85th-percentile speed (V85, the number traffic engineers use), the share of drivers over the limit, an annotated video, and a photo crop of every vehicle,
5. publishes the study to the **OriginTrail DKG** (a decentralized knowledge graph) as a Knowledge Asset, so a city can verify the video and numbers were not changed,
6. keeps a **Calibration Memory** on the DKG: once a camera is calibrated from a car driving past at a known speed, that calibration is published and reused, so new footage from that camera can be measured.

The emotional core: **"Evidence the city will accept, instead of anecdotes it can ignore."** The honesty core: **green = proven, red = refused with a reason, never a guess.**

## 2. Tech stack (use these exact major versions; do not mix majors)

- Vite + React **18.3** + TypeScript
- `three` **0.16x**
- `@react-three/fiber` **8.x** (v8 is the React 18 line; v9 needs React 19, do not use it)
- `@react-three/drei` **9.x** (matches fiber 8)
- `@react-three/postprocessing` **2.x** (matches fiber 8) for bloom
- `d3-force-3d` for the knowledge-graph layout (compute positions once, synchronously)
- `recharts` for the 2D charts
- `react-router-dom` 6 for pages
- No UI kit is required. Plain CSS modules or Tailwind are fine.

The reference for the 3D view is the Cortico "3D data visualization with React and three.js" demo (github.com/CorticoAI/3d-react-demo). It was written in 2019 with old APIs (`react-three-fiber` v4, `react-spring/three`, `attachArray`). **Copy its ideas, not its code**: one `instancedMesh` for all objects, `setMatrixAt` per instance, layouts that write x/y/z, a source→target interpolation animated over ~1.2 s, click picking by `instanceId`, bloom + antialiasing post-processing.

Configuration: the backend base URL comes from `import.meta.env.VITE_API_BASE` (default `http://localhost:8080`). Every image/video URL the API returns is a path like `/api/studies/...`; always prefix it with the base URL. The backend already allows CORS from `http://localhost:5173`.

## 3. Visual design

A night street, lit by sodium lamps. Dark, calm, precise, a little cinematic.

- Background `#0B0E14` (near-black navy), panels `#131826`, borders `#232A3B`, text `#E8ECF4`, muted text `#8A93A6`.
- Accent (sodium-lamp amber) `#F2A93B` for primary buttons, the posted-limit line and highlights.
- Semantic colors, used everywhere including 3D (they match the annotated video the backend renders):
  - proven `#3DDC84` (green)
  - over the limit (proven but faster than the posted limit) `#F2A93B` (amber)
  - refused `#FF5A4F` (red)
  - DKG / knowledge `#7C8CFF` (indigo)
  - Livepeer `#00D6A4` (teal)
- Type: `IBM Plex Sans` for UI, `IBM Plex Mono` for numbers, hashes and UALs (Google Fonts). Big numbers use tabular figures.
- Motion: purposeful and short (150 to 300 ms for UI, ~1.2 s for 3D layout changes, ease-in-out). Respect `prefers-reduced-motion`.

## 4. Pages and flows

### 4.1 Home `/`
- Hero line: "Evidence the city will accept." Sub: "Film your street. StreetProof measures every car with the Livepeer network, refuses what it can't prove, and publishes a study anyone can verify."
- Two big actions: **Upload a street video** (file input, mp4) and **Try a sample** (list from `GET /api/samples`, one card per sample with its `title`; samples with `ready: true` run immediately on click).
- A strip linking to: Every car (3D), Accuracy, Calibration Memory, Verify.

### 4.2 Calibrate `/study/:id/calibrate` (after upload)
- Show `links.firstFrame` full width. The user clicks **two points on the near curb**. Draw the two points and the line between them. Convert click positions to **the image's natural pixel coordinates** (the displayed image is scaled; use `naturalWidth/clientWidth`).
- Inputs: distance between the two points in metres (number), posted limit km/h (default 50), street label (text, for example "Champlain Cres, Peterborough"), checkbox "Check the footage conditions with Livepeer vision" (`checkConditions`).
- Alternative tab **"Use Calibration Memory"**: a select filled from `GET /api/calibrations` (show `cameraLabel`, `focalPx`, `ual`), plus "vehicle height (m)" defaulting to 1.5. This sends `calibrationRef` instead of `calibration`.
- Third option, small link **"Run with no calibration"**: sends neither. The backend then refuses every vehicle with `NO_CALIBRATION`. This is used in the demo to show what knowledge changes.
- Submit → `POST /api/studies/{id}/run` → go to the progress page.

### 4.3 Progress `/study/:id`
- Poll `GET /api/studies/{id}` every 1000 ms until `status` is `DONE` or `FAILED`.
- A stepper: Extracting frames → Detecting with Livepeer → Measuring → Rendering → Done.
- While `DETECTING`, show big live counters: frames `progress.framesDone / progress.framesTotal`, **Livepeer calls** `livepeerCalls`, **cost** `estimatedCostUsd` (format `$0.000`). Label it "Livepeer network working live". If `usedCachedDetections` is true show "Detections reused from an earlier run (no new Livepeer calls)".
- On `FAILED` show `error` exactly as returned, plus a "Try again" button that re-POSTs the same run request (the backend resumes from saved frames).

### 4.4 Results `/study/:id/results`
Top to bottom:
1. **Headline** from `GET /api/studies/{id}/analysis` → `headline`.
2. **Stat tiles**: V85 (`summary.v85Kmh`, km/h), median, share over limit (%), proven / observed vehicles, refused count. If `v85Kmh` is null, show "No claim" instead of a number.
3. **Annotated video** (`links.video`, a normal `<video controls>`).
4. **Charts** (recharts):
   - speed histogram from `histogram` (bars), with a vertical reference line at `summary.postedLimitKmh` in amber;
   - speed over time from `speedOverTime` (scatter, x = seconds, y = km/h), limit line;
   - refusals by reason from `refusalsByReason` (horizontal bars, red).
5. **Vehicle table** from `GET /api/studies/{id}/vehicles`: thumbnail (`thumbnailUrl`), `#trackId`, label, km/h or "refused", verdict chip (proven / over limit / refused), reason (`reasonMeaning` + `detail`), direction, clean frames. Clicking a row seeks the video to `firstSeenSeconds`.
6. **Publish to the DKG** button → `POST /api/studies/{id}/publish` → show `ual` (mono, copy button), `network`, `publishedAt`. If the study's `calibrationUal` is set, show "Calibrated with" + that UAL.
7. **"What gets published"** expandable: `GET /api/studies/{id}/asset` pretty-printed JSON.

### 4.5 Every car `/universe` (the wow view, see section 5)

### 4.6 Accuracy `/accuracy`
- `GET /api/validation`. Show `summary` as the page headline.
- Table: clip, role (`calibration` rows marked "used to calibrate"), known km/h, measured km/h, error %, proven or the refusal text. Color the error cell green within ±5 %, amber within ±10 %, red beyond.
- One sentence under it: "Known speeds come from cars on cruise control (VS13 dataset). The calibration clip is excluded from the error."

### 4.7 Calibration Memory `/calibrations`
- List `GET /api/calibrations` as cards: `cameraLabel`, `focalPx`, `frameWidth×frameHeight`, learned from `knownKmh` km/h, `ual`, `network`, `createdAt`.
- Form "Learn a calibration from a known-speed pass": select a finished study (from `GET /api/studies` where `status === "DONE"`), known km/h, vehicle height m, camera label → `POST /api/calibrations`. Show the returned record.
- A **"Fetch from the DKG"** button per card → `GET /api/calibrations/resolve?ref={ual}` and show the returned `focalPx` next to the stored one ("retrieved from the network: 927.2 px").

### 4.8 Verify `/verify`
- Drop a video file + optional UAL field → `POST /api/verify` (multipart `file`, `ual`).
- Big result: `MATCH` green "This is exactly the video the published study measured", `MISMATCH` red, `NO_RECORD` grey. Show `message`, `uploadedSha256` and `recordedSha256` in mono.

## 5. The 3D "Every car" view (the showpiece)

A full-screen `<Canvas>` showing **every measured vehicle from every finished study** as glowing objects, with several layouts that the user switches between and that **animate smoothly into each other**. Data: `GET /api/graph` (all studies). Use nodes with `type === "vehicle"` for the objects; use the other node types for the knowledge-graph layout.

### 5.1 Objects
- One `instancedMesh` for all vehicles (`args={[undefined, undefined, count]}`), geometry a small rounded box or a flat card (`boxGeometry` 1 × 0.6 × 0.08). Never one mesh per vehicle.
- Color per instance from `group`: `proven` green, `over-limit` amber, `refused` red. Use `mesh.setColorAt(i, color)` and set `mesh.instanceColor.needsUpdate = true`. Material `meshStandardMaterial` with a little `emissive`, `toneMapped={false}` so bloom picks up the bright ones.
- Size: scale each instance by speed (`value`, km/h): `scale = 0.6 + (kmh / 120)`; refused vehicles fixed at 0.6.

### 5.2 Layouts (pure functions that write `x, y, z` onto each datum)
1. **Sphere of photos (default, "fully capturing the picture")**: Fibonacci sphere, radius 12. For i in 0..n-1: `y = 1 - 2*(i+0.5)/n`, `r = sqrt(1-y*y)`, `phi = i * 2.399963`, position `(cos(phi)*r, y, sin(phi)*r) * 12`. In this layout, **also render each vehicle's thumbnail** as a textured plane facing outwards (drei `<Image url=... />` or `useTexture`), because this is the view people remember. Cap textured planes at 400; beyond that keep only the instances.
2. **Speed columns**: bucket proven vehicles by 5 km/h (`floor(kmh/5)*5`). Each bucket is a column along x (spacing 1.3), vehicles stacked on y (spacing 0.7). Refused vehicles form their own red column at the far left labelled "refused". Draw a translucent amber plane at the posted limit's x position with a label "limit 50 km/h" (use the most common `postedLimitKmh` in the data).
3. **Timeline**: x = `firstSeenSeconds` scaled to −15..15 per study, y = km/h scaled to 0..10, z = study index × 3 (each study is a lane). Refused vehicles sit at y = −1.
4. **Knowledge graph**: every node from `/api/graph` (study, vehicle, reason, calibration, gate, capability, street, knowledgeAsset). Compute positions once with `d3-force-3d` (`forceSimulation(nodes, 3).force("link", forceLink(links).id(d => d.id).distance(4)).force("charge", forceManyBody().strength(-30)).force("center", forceCenter())`, then call `.tick()` 300 times synchronously and stop). Vehicles move to their computed positions; non-vehicle nodes are drawn as separate labelled spheres (drei `<Html>` or `<Text>` labels) in their type color: knowledgeAsset indigo, capability teal ("Livepeer yolo-detect"), gate white, reason red, study amber, street grey. Draw links as thin lines (`<lineSegments>` with one `BufferGeometry` for all links). This is the DKG made visible: **say so on screen**: "This is the knowledge the DKG holds."

### 5.3 Animated transitions (the Cortico trick, modern version)
- Keep `data` as an array of mutable objects `{ id, group, value, ..., x, y, z, sx, sy, sz, tx, ty, tz }`.
- On layout change: copy current `x,y,z` into `sx,sy,sz`, run the layout into `tx,ty,tz`, set `progress = 0`.
- In `useFrame((_, delta) => ...)`: `progress = min(1, progress + delta / 1.2)`, eased `t = progress < 0.5 ? 4p³ : 1 - (-2p+2)³/2`; set `x = sx + (tx - sx) * t` (same for y, z); write matrices with one reused `THREE.Object3D` (`position.set`, `scale.setScalar`, `updateMatrix`, `mesh.setMatrixAt(i, obj.matrix)`), then `mesh.instanceMatrix.needsUpdate = true`. Only do this work while `progress < 1` or while something is hovered.
- Add a small per-instance stagger (delay by `i / n * 0.3` s) so the objects flow instead of teleporting together.

### 5.4 Interaction
- Camera: drei `<OrbitControls enableDamping />`, gentle `autoRotate` when idle for 8 s, stop on pointer down.
- Hover: `onPointerMove` on the instancedMesh gives `e.instanceId`; enlarge that instance 1.4× and show a floating card (drei `<Html>`) with the thumbnail, "#id · 48.7 km/h", verdict chip and reason.
- Click: ignore clicks that moved more than 5 px since pointer down (it was a drag). Otherwise open a right-side panel with the vehicle details and a button "Open study" → results page at the right second.
- Layout switcher: a floating glass pill bar at the bottom: Sphere · Speed · Timeline · Knowledge graph. Keyboard 1 to 4.
- **Showcase mode** button: cycles the four layouts every 6 s with a slow camera orbit. Used for the demo video.
- Legend (top left): green proven, amber over limit, red refused, with counts.

### 5.5 Look
- `<color attach="background" args={["#0B0E14"]} />`, fog `#0B0E14` near 25 far 60.
- Lights: one ambient 0.4, one directional, one amber point light low on the "street" side.
- Post-processing (`@react-three/postprocessing`): `<EffectComposer><Bloom intensity={0.8} luminanceThreshold={0.35} mipmapBlur /></EffectComposer>`. Antialias via the Canvas `gl={{ antialias: true }}`.
- `dpr={[1, 2]}`; target 60 fps with 5,000 instances.

## 6. API contract (exact)

Errors are JSON `{ "status": 400, "detail": "..." }` (Spring ProblemDetail). Show `detail` to the user as is.

- `POST /api/studies` multipart field `file` → `StudyView`
- `GET /api/studies` → `StudyView[]` (newest first)
- `GET /api/studies/{id}` → `StudyView`
- `POST /api/studies/{id}/run` JSON, one of:
  - `{ "calibration": { "mode": "CURB_MARKS", "x1": 140, "y1": 610, "x2": 900, "y2": 612, "metres": 12.0 }, "postedLimitKmh": 40, "streetLabel": "…", "checkConditions": true }`
  - `{ "calibrationRef": "<ual or id>", "vehicleHeightMetres": 1.5, "postedLimitKmh": 50 }`
  - `{ "postedLimitKmh": 50 }` (no calibration: every vehicle refused `NO_CALIBRATION`)
  → `StudyView` with status `QUEUED`
- `GET /api/studies/{id}/first-frame` → JPEG
- `GET /api/studies/{id}/video` → MP4 (annotated), `GET /api/studies/{id}/source` → original MP4
- `GET /api/studies/{id}/vehicles` → `VehicleView[]`
- `GET /api/studies/{id}/vehicles/{trackId}/thumbnail` → JPEG
- `GET /api/studies/{id}/analysis` → `SpeedAnalysis`
- `GET /api/studies/{id}/graph` and `GET /api/graph` → `{ nodes: Node[], links: Link[] }`
- `GET /api/studies/{id}/asset` → JSON-LD object
- `POST /api/studies/{id}/publish` → `{ ual, network, mode, publishedAt, assetSha256, contextGraph, evidence }`
- `GET /api/samples` → `[{ name, title, credit, ready, preset }]`; `POST /api/samples/{name}/study` → `StudyView`
- `GET /api/validation` → `{ clips, proven, refused, meanAbsErrorPercent, maxAbsErrorPercent, calibrationClip, rows: [{ studyId, clip, role, knownKmh, measuredKmh, errorPercent, proven, refusal }], summary }`
- `GET /api/calibrations` → `CalibrationRecord[]`; `POST /api/calibrations` `{ studyId, knownKmh, vehicleHeightMetres, cameraLabel, trackId? }` → `CalibrationRecord`; `GET /api/calibrations/resolve?ref=…` → `CalibrationRecord` fetched from the DKG
- `POST /api/verify` multipart `file`, optional `ual` → `{ outcome: "MATCH"|"MISMATCH"|"NO_RECORD", message, uploadedSha256, recordedSha256, ual, studyId, summary }`
- `GET /api/health` → `{ ffmpeg, livepeerKeySet, knowledgeMode, … }`

Types:

```ts
type StudyStatus = "UPLOADED" | "QUEUED" | "EXTRACTING" | "DETECTING" | "MEASURING" | "RENDERING" | "DONE" | "FAILED";
interface StudyView {
  id: string; createdAt: string; sourceName: string; group: string; streetLabel: string | null;
  status: StudyStatus; videoSha256: string;
  video: { durationSeconds: number; sourceFps: number; width: number; height: number };
  frameWidth: number; frameHeight: number;
  calibration: { mode: "CURB_MARKS" | "VEHICLE_LENGTH" | "APPROACH"; x1?: number; y1?: number; x2?: number; y2?: number; metres: number; focalPx?: number } | null;
  calibrationUal: string | null;
  postedLimitKmh: number; sampleFps: number; knownKmh: number | null;
  progress: { framesDone: number; framesTotal: number };
  livepeerCalls: number; estimatedCostUsd: number; usedCachedDetections: boolean; conditionsNote: string | null;
  summary: StudySummary | null; published: Published | null; error: string | null;
  links: { firstFrame: string; source: string; video: string | null; vehicles: string | null; analysis: string | null; graph: string | null; asset: string | null };
}
interface StudySummary { vehiclesObserved: number; vehiclesProven: number; vehiclesRefused: number; v85Kmh: number | null; medianKmh: number | null; shareOverLimit: number | null; postedLimitKmh: number }
interface VehicleView {
  trackId: number; label: string; proven: boolean; kmh: number | null; overLimit: boolean;
  reason: string | null; reasonMeaning: string | null; detail: string | null; direction: "left-to-right" | "right-to-left";
  firstSeenSeconds: number; lastSeenSeconds: number; cleanFrames: number; totalFrames: number;
  rSquared: number; medianConfidence: number; knownKmh: number | null; errorPercent: number | null; thumbnailUrl: string;
}
interface SpeedAnalysis {
  summary: StudySummary; meanKmh: number | null; maxKmh: number | null; shareOverLimitBy10: number | null;
  histogram: { fromKmh: number; toKmh: number; count: number }[];
  refusalsByReason: Record<string, number>;
  speedOverTime: { timeSeconds: number; kmh: number; trackId: number }[];
  byDirection: Record<string, number>; headline: string;
}
interface GraphNode { id: string; type: "study" | "vehicle" | "reason" | "calibration" | "gate" | "capability" | "street" | "knowledgeAsset"; label: string; group: string; value: number | null; imageUrl: string | null; data: Record<string, unknown> }
interface GraphLink { source: string; target: string; relation: string }
interface CalibrationRecord { id: string; cameraLabel: string; mode: string; focalPx: number; frameWidth: number; frameHeight: number; derivedFromStudy: string | null; derivedFromVideoSha256: string | null; knownKmh: number; vehicleHeightMetres: number; trackId: number; createdAt: string; ual: string; network: string }
```

## 7. Engineering rules

- Build against the real API. A `fixtures/` folder with one sample `graph.json` is allowed **only** behind `?fixtures=1` for working on the 3D view offline, and the UI must show a "demo data" badge when it is used. Never ship fixtures as the default.
- One API module (`src/api.ts`) with typed functions; components never call `fetch` directly.
- Loading, empty and error states for every page. Empty 3D view: "Run a study to fill the universe."
- The 3D view must stay at 60 fps with 5,000 vehicles: instancing, no per-frame React state updates, no per-frame allocations (reuse `Object3D`, `Color`, vectors).
- Accessibility: every button has a label, keyboard works for the layout switcher and the table.
- Keep components small: `pages/`, `components/`, `three/` (Universe, InstancedVehicles, layouts.ts, KnowledgeLinks, HoverCard), `api.ts`, `types.ts`.

## 8. Definition of done

1. Upload → calibrate by clicking two curb points → watch live Livepeer counters → results with video, charts, table → publish shows a UAL.
2. Sample button runs a ready sample in one click.
3. `/universe` shows every vehicle, switches between the four layouts with smooth animated transitions, hover card and click panel work, showcase mode cycles, bloom glow visible, 60 fps.
4. `/accuracy`, `/calibrations` (including "Fetch from the DKG"), `/verify` all work against the API.
5. `npm run build` passes with no TypeScript errors.
