export type StudyStatus = 'UPLOADED' | 'QUEUED' | 'EXTRACTING' | 'DETECTING' | 'MEASURING' | 'RENDERING' | 'DONE' | 'FAILED'

export interface Calibration {
  mode: 'CURB_MARKS' | 'VEHICLE_LENGTH' | 'APPROACH'
  x1?: number | null
  y1?: number | null
  x2?: number | null
  y2?: number | null
  metres?: number | null
  focalPx?: number | null
}

export interface StudySummary {
  vehiclesObserved: number
  vehiclesProven: number
  vehiclesRefused: number
  v85Kmh: number | null
  medianKmh: number | null
  shareOverLimit: number | null
  postedLimitKmh: number
}

export interface PublishedRecord {
  ual: string
  network: string
  mode: string
  publishedAt: string
  assetSha256: string
  contextGraph: string
  evidence: string
}

export interface StudyView {
  id: string
  createdAt: string
  sourceName: string
  group: string | null
  streetLabel: string | null
  status: StudyStatus
  videoSha256: string
  video: { durationSeconds: number; sourceFps: number; width: number; height: number } | null
  frameWidth: number
  frameHeight: number
  calibration: Calibration | null
  calibrationUal: string | null
  postedLimitKmh: number
  sampleFps: number
  knownKmh: number | null
  progress: { framesDone: number; framesTotal: number }
  livepeerCalls: number
  estimatedCostUsd: number
  usedCachedDetections: boolean
  conditionsNote: string | null
  summary: StudySummary | null
  published: PublishedRecord | null
  error: string | null
  links: {
    firstFrame: string | null
    source: string | null
    video: string | null
    vehicles: string | null
    analysis: string | null
    graph: string | null
    asset: string | null
  }
}

export interface VehicleView {
  trackId: number
  label: string
  proven: boolean
  kmh: number | null
  overLimit: boolean
  reason: string | null
  reasonMeaning: string | null
  detail: string | null
  direction: string
  firstSeenSeconds: number
  lastSeenSeconds: number
  cleanFrames: number
  totalFrames: number
  rSquared: number
  medianConfidence: number
  knownKmh: number | null
  errorPercent: number | null
  thumbnailUrl: string
}

export interface SpeedAnalysis {
  summary: StudySummary
  meanKmh: number | null
  maxKmh: number | null
  shareOverLimitBy10: number | null
  histogram: { fromKmh: number; toKmh: number; count: number }[]
  refusalsByReason: Record<string, number>
  speedOverTime: { timeSeconds: number; kmh: number; trackId: number }[]
  byDirection: Record<string, number>
  headline: string
  p95Kmh: number | null
}

export interface CalibrationEvidence {
  studyId: string
  clip: string
  videoSha256: string
  studyUal: string | null
  knownKmh: number
  vehicleHeightMetres: number
  trackId: number
  focalPx: number
  deviationPercent: number
}

export interface CalibrationRecord {
  id: string
  cameraLabel: string
  mode: string
  focalPx: number
  frameWidth: number
  frameHeight: number
  derivedFromStudy: string
  derivedFromVideoSha256: string
  knownKmh: number
  vehicleHeightMetres: number
  trackId: number
  createdAt: string
  ual: string | null
  network: string | null
  passes: CalibrationEvidence[] | null
  spreadPercent: number | null
}

export interface ValidationRow {
  studyId: string
  clip: string
  role: 'calibration' | 'test'
  knownKmh: number
  measuredKmh: number | null
  errorPercent: number | null
  proven: boolean
  refusal: string | null
}

export interface ValidationReport {
  clips: number
  proven: number
  refused: number
  meanAbsErrorPercent: number | null
  maxAbsErrorPercent: number | null
  calibrationClip: string | null
  rows: ValidationRow[]
  summary: string
  calibrationUal: string | null
  calibrationClips: string[]
  crossValidation: {
    method: string
    levels: { passes: number; combinations: number; meanAbsErrorPercent: number; worstCombinationMeanPercent: number; worstClipErrorPercent: number }[]
    singleClipChoices: { clip: string; meanAbsErrorPercent: number; worstAbsErrorPercent: number }[]
  } | null
}

export interface SampleClip {
  name: string
  title: string
  credit: string
  ready: boolean
  preset: Record<string, unknown> | null
}

export interface VerifyResult {
  outcome: 'MATCH' | 'MISMATCH' | 'NO_RECORD'
  message: string
  uploadedSha256: string
  recordedSha256: string | null
  ual: string | null
  studyId: string | null
  summary: StudySummary | null
}

export interface Health {
  ffmpeg: boolean
  livepeerKeySet: boolean
  livepeerEndpoint: string
  knowledgeMode: string
  workDir: string
  sampleFps: number
}

export interface FieldStudy {
  id: string
  clip: string
  street: string | null
  group: string | null
  calibrated: boolean
  calibrationUal: string | null
  ual: string | null
  postedLimitKmh: number
  knownKmh: number | null
  frameWidth: number
  frameHeight: number
}

export interface FieldVehicle {
  study: number
  trackId: number
  group: 'proven' | 'over-limit' | 'refused'
  kmh: number | null
  reason: string | null
  reasonMeaning: string | null
  detail: string | null
  direction: string
  medianConfidence: number
  errorPercent: number | null
  thumbnailUrl: string
  detections: number
}

export interface DetectionField {
  detections: number
  studies: FieldStudy[]
  vehicles: FieldVehicle[]
  points: {
    vehicle: number[]
    frame: number[]
    t: number[]
    confidence: number[]
    x: number[]
    y: number[]
    w: number[]
    h: number[]
  }
}

export interface RunRequest {
  calibration?: Calibration | null
  calibrationRef?: string | null
  vehicleHeightMetres?: number | null
  postedLimitKmh?: number | null
  sampleFps?: number | null
  knownKmh?: number | null
  streetLabel?: string | null
  group?: string | null
  checkConditions?: boolean | null
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init)
  const text = await response.text()
  const body = text ? JSON.parse(text) : null
  if (!response.ok) {
    const detail = body && (body.detail || body.message || body.error)
    throw new ApiError(response.status, detail || `Request failed with ${response.status}`)
  }
  return body as T
}

function json(method: string, body: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) }
}

export const api = {
  health: () => request<Health>('/api/health'),
  studies: () => request<StudyView[]>('/api/studies'),
  study: (id: string) => request<StudyView>(`/api/studies/${id}`),
  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<StudyView>('/api/studies', { method: 'POST', body: form })
  },
  run: (id: string, body: RunRequest) => request<StudyView>(`/api/studies/${id}/run`, json('POST', body)),
  vehicles: (id: string) => request<VehicleView[]>(`/api/studies/${id}/vehicles`),
  analysis: (id: string) => request<SpeedAnalysis>(`/api/studies/${id}/analysis`),
  publish: (id: string) => request<PublishedRecord>(`/api/studies/${id}/publish`, json('POST', {})),
  samples: () => request<SampleClip[]>('/api/samples'),
  fromSample: (name: string) => request<StudyView>(`/api/samples/${encodeURIComponent(name)}/study`, json('POST', {})),
  validation: () => request<ValidationReport>('/api/validation'),
  calibrations: () => request<CalibrationRecord[]>('/api/calibrations'),
  field: () => request<DetectionField>('/api/field'),
  verifyHash: (sha256: string, ual: string | null) => request<VerifyResult>('/api/verify/hash', json('POST', { sha256, ual })),
  reportUrl: (id: string) => `/api/studies/${id}/report`,
}

export async function sha256OfFile(file: File, tamper = false): Promise<string> {
  const buffer = await file.arrayBuffer()
  let bytes = new Uint8Array(buffer)
  if (tamper && bytes.length > 0) {
    const copy = new Uint8Array(bytes)
    const middle = Math.floor(copy.length / 2)
    copy[middle] = copy[middle] ^ 0x01
    bytes = copy
  }
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function short(value: string | null | undefined, head = 10, tail = 8) {
  if (!value) return ''
  return value.length <= head + tail + 3 ? value : `${value.slice(0, head)}…${value.slice(-tail)}`
}

export function clipName(sourceName: string) {
  return sourceName.replace(/^vs13-/, '').replace(/\.mp4$/i, '').replace(/_(\d+)$/, ' · $1 km/h')
}
