import type { DetectionField } from '../api'
import { clipName } from '../api'
import type { CameraView, FieldLabel } from './DiscField'

export type LayoutId = 'sequential' | 'clip' | 'vehicle' | 'verdict' | 'reason' | 'confidence' | 'speed' | 'road'

export const LAYOUTS: { id: LayoutId; label: string; hint: string }[] = [
  { id: 'sequential', label: 'Sequential', hint: 'Every detection in clip and time order' },
  { id: 'clip', label: 'Clip', hint: 'Grouped by the video they came from' },
  { id: 'vehicle', label: 'Vehicle', hint: 'Grouped into the tracked vehicles' },
  { id: 'verdict', label: 'Verdict', hint: 'Proven, over the limit, or refused' },
  { id: 'reason', label: 'Refusal reason', hint: 'Why the gate refused, if it did' },
  { id: 'confidence', label: 'Confidence', hint: 'Detector confidence, stacked' },
  { id: 'speed', label: 'Speed', hint: 'Measured km/h, stacked per vehicle' },
  { id: 'road', label: 'Road', hint: 'Where in the frame each box was, stacked' },
]

export const SPACING = 1.05
export const STACK = 0.17

export interface PointMeta {
  vehicle: number
  study: number
  clip: string
  vehicleKey: string
  vehicleLabel: string
  group: 'proven' | 'over-limit' | 'refused'
  reason: string
  calibrated: boolean
  confidence: number
  kmh: number | null
}

export const GROUP_LABEL: Record<string, string> = {
  proven: 'Proven, under the limit',
  'over-limit': 'Proven, over the limit',
  refused: 'Refused',
}

export function describe(field: DetectionField): PointMeta[] {
  const out: PointMeta[] = []
  const p = field.points
  for (let i = 0; i < field.detections; i++) {
    const v = field.vehicles[p.vehicle[i]]
    const s = field.studies[v.study]
    const clip = clipName(s.clip) + (s.calibrated ? '' : ' · no calibration')
    out.push({
      vehicle: p.vehicle[i],
      study: v.study,
      clip,
      vehicleKey: `${v.study}:${v.trackId}`,
      vehicleLabel: `${clipName(s.clip)} · car #${v.trackId}`,
      group: v.group,
      reason: v.reason ?? 'PROVEN',
      calibrated: s.calibrated,
      confidence: p.confidence[i],
      kmh: v.kmh,
    })
  }
  return out
}

interface Group {
  key: string
  label: string
  sub?: string
  indices: number[]
}

interface Extent {
  minX: number
  maxX: number
  minY: number
  maxY: number
  maxZ?: number
}

export interface LayoutResult {
  positions: Float32Array
  labels: FieldLabel[]
  view: CameraView
}

function frontView(extent: Extent, aspect: number, fill = 1.08): CameraView {
  const w = Math.max(4, extent.maxX - extent.minX)
  const h = Math.max(4, extent.maxY - extent.minY)
  const half = Math.tan((75 / 2) * (Math.PI / 180))
  const distance = Math.max(8, (Math.max(h / 2, w / 2 / Math.max(aspect, 0.3)) / half) * fill * 1.28)
  const cx = (extent.minX + extent.maxX) / 2
  const cy = (extent.minY + extent.maxY) / 2 + distance * half * 0.1
  return { position: [cx, cy, distance], target: [cx, cy, 0] }
}

function tiltedView(extent: Extent, aspect: number): CameraView {
  const w = Math.max(4, extent.maxX - extent.minX)
  const h = Math.max(4, extent.maxY - extent.minY)
  const z = extent.maxZ ?? 0
  const size = Math.max(h * 1.05, w / Math.max(aspect, 0.3), z * 1.3) * 0.72
  const cx = (extent.minX + extent.maxX) / 2
  const cy = (extent.minY + extent.maxY) / 2
  return { position: [cx, cy - size * 0.82, size * 0.78 + z * 0.3], target: [cx, cy + h * 0.04, z * 0.22] }
}

function placeGrid(indices: number[], positions: Float32Array, left: number, top: number, cols: number) {
  indices.forEach((index, k) => {
    positions[index * 3] = left + (k % cols) * SPACING
    positions[index * 3 + 1] = top - Math.floor(k / cols) * SPACING
    positions[index * 3 + 2] = 0
  })
}

function blocks(groups: Group[], positions: Float32Array, aspect: number): { labels: FieldLabel[]; extent: Extent } {
  const sized = groups.filter((g) => g.indices.length > 0).map((g) => {
    const cols = Math.max(1, Math.ceil(Math.sqrt(g.indices.length)))
    const rows = Math.ceil(g.indices.length / cols)
    return { ...g, cols, rows, w: cols * SPACING, h: rows * SPACING }
  })
  const gap = 4.2
  const labelRoom = 3.2
  const area = sized.reduce((sum, g) => sum + (g.w + gap) * (g.h + gap + labelRoom), 0)
  const targetWidth = Math.max(...sized.map((g) => g.w), Math.sqrt(area * Math.max(aspect, 0.8)))
  const labels: FieldLabel[] = []
  let x = 0
  let y = 0
  let rowHeight = 0
  const placed: { g: (typeof sized)[number]; x: number; y: number }[] = []
  for (const g of sized) {
    if (x > 0 && x + g.w > targetWidth) {
      x = 0
      y -= rowHeight + gap + labelRoom
      rowHeight = 0
    }
    placed.push({ g, x, y })
    x += g.w + gap
    rowHeight = Math.max(rowHeight, g.h)
  }
  const extent: Extent = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
  for (const { g, x: px, y: py } of placed) {
    extent.minX = Math.min(extent.minX, px)
    extent.maxX = Math.max(extent.maxX, px + g.w)
    extent.minY = Math.min(extent.minY, py - g.h)
    extent.maxY = Math.max(extent.maxY, py + labelRoom)
  }
  const cx = (extent.minX + extent.maxX) / 2
  const cy = (extent.minY + extent.maxY) / 2
  for (const { g, x: px, y: py } of placed) {
    const left = px - cx + SPACING / 2
    const top = py - cy - SPACING / 2
    placeGrid(g.indices, positions, left, top, g.cols)
    labels.push({ text: g.label, sub: g.sub ?? `${g.indices.length}`, x: left - SPACING / 2, y: top + 2.0, z: 0 })
  }
  return { labels, extent: { minX: extent.minX - cx, maxX: extent.maxX - cx, minY: extent.minY - cy, maxY: extent.maxY - cy } }
}

function groupBy(visible: number[], keyOf: (i: number) => string, labelOf: (key: string, first: number) => string, order?: (a: Group, b: Group) => number): Group[] {
  const map = new Map<string, Group>()
  for (const i of visible) {
    const key = keyOf(i)
    let g = map.get(key)
    if (!g) {
      g = { key, label: labelOf(key, i), indices: [] }
      map.set(key, g)
    }
    g.indices.push(i)
  }
  const groups = [...map.values()]
  groups.sort(order ?? ((a, b) => b.indices.length - a.indices.length))
  return groups
}

function footprintStacks(visible: number[], positions: Float32Array, groupOf: (i: number) => string, cellOf: (i: number) => [number, number], side = 3): Extent {
  const counters = new Map<string, number>()
  const heights = new Map<string, number>()
  const extent: Extent = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, maxZ: 0 }
  for (const i of visible) {
    const group = groupOf(i)
    const k = counters.get(group) ?? 0
    counters.set(group, k + 1)
    const [bx, by] = cellOf(i)
    const cx = bx * side + (k % side)
    const cy = by * side - (Math.floor(k / side) % side)
    const key = `${cx}:${cy}`
    const h = heights.get(key) ?? 0
    heights.set(key, h + 1)
    positions[i * 3] = cx * SPACING
    positions[i * 3 + 1] = cy * SPACING
    positions[i * 3 + 2] = h * STACK
    extent.maxZ = Math.max(extent.maxZ ?? 0, h * STACK)
    extent.minX = Math.min(extent.minX, cx * SPACING)
    extent.maxX = Math.max(extent.maxX, cx * SPACING)
    extent.minY = Math.min(extent.minY, cy * SPACING)
    extent.maxY = Math.max(extent.maxY, cy * SPACING)
  }
  return extent
}

function stacks(visible: number[], positions: Float32Array, cellOf: (i: number) => [number, number]): Extent {
  const heights = new Map<string, number>()
  const extent: Extent = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, maxZ: 0 }
  for (const i of visible) {
    const [cx, cy] = cellOf(i)
    const key = `${cx}:${cy}`
    const k = heights.get(key) ?? 0
    heights.set(key, k + 1)
    positions[i * 3] = cx * SPACING
    positions[i * 3 + 1] = cy * SPACING
    positions[i * 3 + 2] = k * STACK
    extent.maxZ = Math.max(extent.maxZ ?? 0, k * STACK)
    extent.minX = Math.min(extent.minX, cx * SPACING)
    extent.maxX = Math.max(extent.maxX, cx * SPACING)
    extent.minY = Math.min(extent.minY, cy * SPACING)
    extent.maxY = Math.max(extent.maxY, cy * SPACING)
  }
  return extent
}

function recentre(visible: number[], positions: Float32Array, extent: Extent, labels: FieldLabel[]): Extent {
  const cx = (extent.minX + extent.maxX) / 2
  const cy = (extent.minY + extent.maxY) / 2
  for (const i of visible) {
    positions[i * 3] -= cx
    positions[i * 3 + 1] -= cy
  }
  for (const label of labels) {
    label.x -= cx
    label.y -= cy
  }
  return { minX: extent.minX - cx, maxX: extent.maxX - cx, minY: extent.minY - cy, maxY: extent.maxY - cy, maxZ: extent.maxZ }
}

export function computeLayout(
  layout: LayoutId,
  field: DetectionField,
  meta: PointMeta[],
  visible: number[],
  aspect: number,
): LayoutResult {
  const positions = new Float32Array(field.detections * 3)
  const p = field.points

  if (layout === 'sequential' || visible.length === 0) {
    const ordered = [...visible].sort((a, b) => meta[a].study - meta[b].study || p.t[a] - p.t[b] || a - b)
    const cols = Math.max(1, Math.ceil(Math.sqrt(ordered.length)))
    const rows = Math.ceil(ordered.length / cols)
    placeGrid(ordered, positions, -((cols - 1) * SPACING) / 2, ((rows - 1) * SPACING) / 2, cols)
    const extent = { minX: -(cols * SPACING) / 2, maxX: (cols * SPACING) / 2, minY: -(rows * SPACING) / 2, maxY: (rows * SPACING) / 2 }
    return { positions, labels: [], view: frontView(extent, aspect, 0.95) }
  }

  if (layout === 'clip' || layout === 'vehicle' || layout === 'verdict' || layout === 'reason') {
    let groups: Group[]
    if (layout === 'clip') {
      groups = groupBy(visible, (i) => meta[i].clip, (key) => key, (a, b) => a.label.localeCompare(b.label))
    } else if (layout === 'vehicle') {
      groups = groupBy(visible, (i) => meta[i].vehicleKey, (_key, i) => {
        const m = meta[i]
        return `${m.vehicleLabel.replace(/ · \d+ km\/h/, '')}${m.kmh !== null ? ` · ${m.kmh.toFixed(1)} km/h` : ' · refused'}`
      }, (a, b) => meta[a.indices[0]].study - meta[b.indices[0]].study || a.key.localeCompare(b.key))
    } else if (layout === 'verdict') {
      const order = ['proven', 'over-limit', 'refused']
      groups = groupBy(visible, (i) => meta[i].group, (key) => GROUP_LABEL[key] ?? key, (a, b) => order.indexOf(a.key) - order.indexOf(b.key))
    } else {
      groups = groupBy(visible, (i) => meta[i].reason, (key) => (key === 'PROVEN' ? 'Proven (no refusal)' : key.replace(/_/g, ' ').toLowerCase()), (a, b) => (a.key === 'PROVEN' ? -1 : b.key === 'PROVEN' ? 1 : b.indices.length - a.indices.length))
    }
    for (const g of groups) {
      const vehicles = new Set(g.indices.map((i) => meta[i].vehicleKey)).size
      const count = layout === 'vehicle' ? `${g.indices.length} detections` : `${g.indices.length} detections · ${vehicles} vehicle${vehicles === 1 ? '' : 's'}`
      if (layout === 'clip' || layout === 'vehicle') {
        const parts = g.label.split(' · ')
        g.label = parts[0]
        g.sub = parts.slice(1).join(' · ') || count
      } else {
        g.sub = count
      }
    }
    const { labels, extent } = blocks(groups, positions, aspect)
    return { positions, labels, view: frontView(extent, aspect) }
  }

  if (layout === 'confidence') {
    const rows = ['proven', 'over-limit', 'refused']
    const labels: FieldLabel[] = []
    const extent = stacks(visible, positions, (i) => [Math.round(meta[i].confidence * 100), -rows.indexOf(meta[i].group) * 5])
    const minBin = Math.floor(extent.minX / SPACING / 10) * 10
    const maxBin = Math.ceil(extent.maxX / SPACING / 10) * 10
    for (let bin = minBin; bin <= maxBin; bin += 10) {
      labels.push({ text: (bin / 100).toFixed(1), x: bin * SPACING, y: extent.minY - 2.5, z: 0 })
    }
    rows.forEach((row, r) => {
      if (visible.some((i) => meta[i].group === row)) labels.push({ text: GROUP_LABEL[row], x: extent.minX - 3, y: -r * 5 * SPACING + 1.4, z: 0 })
    })
    const centred = recentre(visible, positions, extent, labels)
    return { positions, labels, view: tiltedView(centred, aspect) }
  }

  if (layout === 'speed') {
    const refused = visible.filter((i) => meta[i].kmh === null)
    const measured = visible.filter((i) => meta[i].kmh !== null)
    const labels: FieldLabel[] = []
    const extent = footprintStacks(measured, positions, (i) => meta[i].vehicleKey, (i) => [Math.round(meta[i].kmh as number), 0])
    if (measured.length === 0) {
      extent.minX = 0
      extent.maxX = 0
      extent.minY = 0
      extent.maxY = 0
    }
    const minBin = Math.floor(extent.minX / SPACING / 3 / 10) * 10
    const maxBin = Math.ceil(extent.maxX / SPACING / 3 / 10) * 10
    for (let kmh = minBin; kmh <= maxBin && measured.length > 0; kmh += 10) {
      labels.push({ text: `${kmh} km/h`, x: kmh * 3 * SPACING, y: extent.minY - 2.2, z: 0 })
    }
    if (refused.length > 0) {
      const cols = Math.max(1, Math.ceil(Math.sqrt(refused.length)))
      const left = (measured.length ? extent.minX : 0) - cols * SPACING - 16
      const top = extent.maxY + Math.ceil(refused.length / cols) * SPACING * 0.5
      placeGrid(refused, positions, left, top, cols)
      const rowsUsed = Math.ceil(refused.length / cols)
      labels.push({ text: 'Refused: no speed claimed', sub: `${refused.length} detections`, x: left - SPACING / 2, y: top + 1.25, z: 0 })
      extent.minX = Math.min(extent.minX, left)
      extent.minY = Math.min(extent.minY, top - rowsUsed * SPACING)
      extent.maxY = Math.max(extent.maxY, top)
    }
    const centred = recentre(visible, positions, extent, labels)
    return { positions, labels, view: tiltedView(centred, aspect) }
  }

  const width = 96
  const labels: FieldLabel[] = []
  const extent = stacks(visible, positions, (i) => {
    const study = field.studies[meta[i].study]
    const ratio = study.frameHeight > 0 && study.frameWidth > 0 ? study.frameHeight / study.frameWidth : 9 / 16
    const x = (p.x[i] - 0.5) * width
    const y = (0.5 - p.y[i]) * width * ratio
    return [Math.round(x / SPACING), Math.round(y / SPACING)]
  })
  labels.push({ text: 'Where in the camera frame Livepeer boxed each car', sub: 'overlapping boxes are stacked', x: extent.minX, y: extent.minY - 3, z: 0 })
  const centred = recentre(visible, positions, extent, labels)
  return { positions, labels, view: tiltedView(centred, aspect) }
}
