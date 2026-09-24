import { useEffect, useMemo, useRef, useState } from 'react'
import { api, clipName, short } from '../api'
import type { DetectionField } from '../api'
import { DiscField, DEFAULT_COLOR, rawColor } from '../field/DiscField'
import { LAYOUTS, GROUP_LABEL, computeLayout, describe } from '../field/layouts'
import type { LayoutId, PointMeta } from '../field/layouts'

type FacetId = 'clip' | 'verdict' | 'reason' | 'calibration'
type ColourId = 'none' | 'verdict' | 'confidence'

const FACETS: { id: FacetId; label: string }[] = [
  { id: 'clip', label: 'Clip' },
  { id: 'verdict', label: 'Verdict' },
  { id: 'reason', label: 'Refusal reason' },
  { id: 'calibration', label: 'Calibration' },
]

const VERDICT_COLOURS: Record<string, string> = { proven: '#5fbf95', 'over-limit': '#e3a64f', refused: '#d65a4f' }

function facetValue(facet: FacetId, m: PointMeta) {
  if (facet === 'clip') return m.clip
  if (facet === 'verdict') return GROUP_LABEL[m.group]
  if (facet === 'reason') return m.reason === 'PROVEN' ? 'Proven' : m.reason.replace(/_/g, ' ').toLowerCase()
  return m.calibrated ? 'Loaded from the DKG' : 'None'
}

interface Props {
  onExit: () => void
  onOpenStudy: (id: string) => void
}

export function FieldScreen({ onExit, onOpenStudy }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<DiscField | null>(null)
  const [field, setField] = useState<DetectionField | null>(null)
  const [error, setError] = useState<string | null>(null)
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const [layout, setLayout] = useState<LayoutId>(() => (LAYOUTS.some((l) => l.id === params.get('layout')) ? (params.get('layout') as LayoutId) : 'sequential'))
  const [colour, setColour] = useState<ColourId>(() => (['none', 'verdict', 'confidence'].includes(params.get('colour') ?? '') ? (params.get('colour') as ColourId) : 'none'))
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<FacetId, string[]>>({ clip: [], verdict: [], reason: [], calibration: [] })
  const [open, setOpen] = useState<FacetId | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [hover, setHover] = useState<{ index: number; x: number; y: number } | null>(null)
  const [aspect, setAspect] = useState(1.6)
  const [touring, setTouring] = useState(() => params.get('tour') === '1')

  const meta = useMemo(() => (field ? describe(field) : []), [field])

  useEffect(() => {
    api.field().then((f) => {
      setField(f)
      const pick = Number(params.get('select'))
      if (params.has('select') && pick >= 0 && pick < f.detections) setSelected(pick)
    }).catch((e: Error) => setError(e.message))
  }, [params])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const engine = new DiscField(container, {
      onSelect: (index) => setSelected(index),
      onHover: (index, x, y) => setHover(index === null ? null : { index, x, y }),
    })
    engineRef.current = engine
    const measure = () => setAspect(container.clientWidth / Math.max(1, container.clientHeight))
    measure()
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('resize', measure)
      engine.dispose()
      engineRef.current = null
    }
  }, [])

  useEffect(() => {
    if (field) engineRef.current?.setCount(field.detections)
  }, [field])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const out: number[] = []
    meta.forEach((m, i) => {
      for (const facet of FACETS) {
        const chosen = filters[facet.id]
        if (chosen.length && !chosen.includes(facetValue(facet.id, m))) return
      }
      if (q) {
        const hay = `${m.clip} ${m.vehicleLabel} #${field?.vehicles[m.vehicle].trackId} ${m.reason} ${m.group}`.toLowerCase()
        if (!hay.includes(q)) return
      }
      out.push(i)
    })
    return out
  }, [meta, filters, search, field])

  useEffect(() => {
    const engine = engineRef.current
    if (!engine || !field) return
    const result = computeLayout(layout, field, meta, visible, aspect)
    const mask = new Uint8Array(field.detections)
    for (const i of visible) mask[i] = 1
    engine.setLayout(result.positions, mask, result.labels, result.view)
  }, [layout, visible, field, meta])

  useEffect(() => {
    const engine = engineRef.current
    if (!engine || !field) return
    const colours = new Float32Array(field.detections * 3)
    const base = rawColor(DEFAULT_COLOR)
    const dim = rawColor('#2e2a45')
    const bright = rawColor('#ddd5ff')
    meta.forEach((m, i) => {
      let c = base
      if (colour === 'verdict') c = rawColor(VERDICT_COLOURS[m.group])
      if (colour === 'confidence') c = dim.clone().lerp(bright, Math.max(0, Math.min(1, (m.confidence - 0.3) / 0.7)))
      colours[i * 3] = c.r
      colours[i * 3 + 1] = c.g
      colours[i * 3 + 2] = c.b
    })
    engine.setBaseColors(colours)
  }, [colour, field, meta])

  useEffect(() => {
    if (selected !== null && !visible.includes(selected)) setSelected(null)
  }, [visible, selected])

  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    if (selected === null) {
      engine.select(null)
      return
    }
    const key = meta[selected]?.vehicleKey
    const siblings = meta.flatMap((m, i) => (m.vehicleKey === key && i !== selected ? [i] : []))
    engine.select(selected, siblings)
  }, [selected, meta])

  useEffect(() => {
    if (!touring) return
    const order: LayoutId[] = ['sequential', 'clip', 'verdict', 'speed', 'road', 'confidence', 'vehicle', 'reason']
    const timer = window.setInterval(() => {
      setLayout((current) => order[(order.indexOf(current) + 1) % order.length])
    }, 5200)
    return () => window.clearInterval(timer)
  }, [touring])

  const chooseLayout = (id: LayoutId) => {
    setTouring(false)
    setLayout(id)
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.tagName === 'INPUT') return
      const n = Number(event.key)
      if (n >= 1 && n <= LAYOUTS.length) {
        setTouring(false)
        setLayout(LAYOUTS[n - 1].id)
      }
      if (event.key === 'r' || event.key === 'R') engineRef.current?.resetCamera()
      if (event.key === 't' || event.key === 'T') setTouring((t) => !t)
      if (event.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const facetOptions = useMemo(() => {
    const result: Record<FacetId, { value: string; count: number }[]> = { clip: [], verdict: [], reason: [], calibration: [] }
    for (const facet of FACETS) {
      const counts = new Map<string, number>()
      for (const m of meta) counts.set(facetValue(facet.id, m), (counts.get(facetValue(facet.id, m)) ?? 0) + 1)
      result[facet.id] = [...counts.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => a.value.localeCompare(b.value))
    }
    return result
  }, [meta])

  const toggle = (facet: FacetId, value: string) => {
    setFilters((prev) => {
      const current = prev[facet]
      return { ...prev, [facet]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value] }
    })
  }

  const anyFilter = FACETS.some((f) => filters[f.id].length > 0) || search.trim().length > 0
  const vehiclesShown = useMemo(() => new Set(visible.map((i) => meta[i].vehicleKey)).size, [visible, meta])
  const detail = selected !== null && field ? buildDetail(field, meta, selected) : null
  const hoverInfo = hover && field && meta[hover.index] ? meta[hover.index] : null

  return (
    <div className="field-shell">
      <aside className="field-sidebar">
        <button className="field-back" onClick={onExit}>← StreetProof</button>
        <input
          className="field-search"
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="field-section">Layout</div>
        {LAYOUTS.map((l, i) => (
          <button
            key={l.id}
            title={`${l.hint} (key ${i + 1})`}
            className={`field-item ${layout === l.id ? 'is-active' : ''}`}
            onClick={() => chooseLayout(l.id)}
          >
            {l.label}
          </button>
        ))}
        <div className="field-section">Filter</div>
        {FACETS.map((f) => (
          <div key={f.id}>
            <button
              className={`field-item ${filters[f.id].length ? 'is-active-text' : ''}`}
              onClick={() => setOpen(open === f.id ? null : f.id)}
            >
              {f.label} <span className="field-plus">{open === f.id ? '–' : '+'}</span>
            </button>
            {open === f.id && (
              <div className="field-options">
                {facetOptions[f.id].map((o) => (
                  <button
                    key={o.value}
                    className={`field-option ${filters[f.id].includes(o.value) ? 'is-on' : ''}`}
                    onClick={() => toggle(f.id, o.value)}
                  >
                    <span>{o.value}</span>
                    <em>{o.count}</em>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {anyFilter && (
          <button
            className="field-item field-clear"
            onClick={() => {
              setFilters({ clip: [], verdict: [], reason: [], calibration: [] })
              setSearch('')
            }}
          >
            Clear filters
          </button>
        )}
        <div className="field-section">Colour</div>
        {(['none', 'verdict', 'confidence'] as ColourId[]).map((c) => (
          <button key={c} className={`field-item ${colour === c ? 'is-active' : ''}`} onClick={() => setColour(c)}>
            {c === 'none' ? 'None' : c === 'verdict' ? 'Verdict' : 'Confidence'}
          </button>
        ))}
        <div className="field-stats">
          {field ? (
            <>
              <strong>{visible.length.toLocaleString()}</strong> of {field.detections.toLocaleString()} Livepeer detections
              <br />
              {vehiclesShown} vehicles · {field.studies.length} studies
              <br />
              <span>Each disc is one yolo-detect box in one frame.</span>
            </>
          ) : error ? (
            <span className="field-error">{error}</span>
          ) : (
            'Loading detections…'
          )}
        </div>
      </aside>

      <div className="field-stage">
        <div ref={containerRef} className="field-canvas" />
        <div className="field-corner">
          <button className={`field-reset ${touring ? 'is-on' : ''}`} onClick={() => setTouring((t) => !t)}>
            {touring ? 'Stop' : 'Start'}
            <br />
            tour
          </button>
          <button className="field-reset" onClick={() => engineRef.current?.resetCamera()}>
            Reset
            <br />
            camera
          </button>
        </div>
        {field && field.detections === 0 && (
          <div className="field-empty">
            No finished studies yet. Run a sample clip first, then come back.
          </div>
        )}
        {hoverInfo && hover && (
          <div className="field-tooltip" style={{ left: hover.x + 14, top: hover.y + 14 }}>
            <strong>{hoverInfo.vehicleLabel}</strong>
            <span>
              frame {field!.points.frame[hover.index]} · conf {hoverInfo.confidence.toFixed(2)} ·{' '}
              {hoverInfo.kmh !== null ? `${hoverInfo.kmh.toFixed(1)} km/h` : 'refused'}
            </span>
          </div>
        )}
        {detail && (
          <div className="field-detail">
            <div className="field-detail-top">
              <img src={detail.thumbnail} alt="" />
              <div>
                <div className="field-detail-kicker">{detail.clip}</div>
                <div className="field-detail-title">Car #{detail.trackId}</div>
                <div className={`field-verdict v-${detail.group}`}>{detail.verdict}</div>
              </div>
              <button className="field-close" onClick={() => setSelected(null)}>×</button>
            </div>
            <dl>
              <dt>This disc</dt>
              <dd>Livepeer yolo-detect box, frame {detail.frame} ({detail.t.toFixed(2)} s), confidence {detail.confidence.toFixed(2)}</dd>
              <dt>Vehicle</dt>
              <dd>{detail.detections} detections tracked into one car</dd>
              {detail.reason && (
                <>
                  <dt>Why refused</dt>
                  <dd>{detail.reason}{detail.detail ? `: ${detail.detail}` : ''}</dd>
                </>
              )}
              {detail.errorPercent !== null && (
                <>
                  <dt>Against known speed</dt>
                  <dd>
                    {detail.errorPercent > 0 ? '+' : ''}
                    {detail.errorPercent}%{detail.calibrationPass ? ' (this clip is a calibration pass, so it is not a held-out test)' : ''}
                  </dd>
                </>
              )}
              {detail.calibrationUal && (
                <>
                  <dt>Calibration (DKG)</dt>
                  <dd className="mono">{short(detail.calibrationUal, 24, 14)}</dd>
                </>
              )}
              {detail.ual && (
                <>
                  <dt>Study asset (DKG)</dt>
                  <dd className="mono">{short(detail.ual, 24, 14)}</dd>
                </>
              )}
            </dl>
            <button className="field-open" onClick={() => onOpenStudy(detail.studyId)}>Open this study →</button>
          </div>
        )}
      </div>
    </div>
  )
}

function buildDetail(field: DetectionField, meta: PointMeta[], index: number) {
  const m = meta[index]
  const v = field.vehicles[m.vehicle]
  const s = field.studies[v.study]
  const verdict = v.group === 'refused' ? 'Refused' : `${v.kmh?.toFixed(1)} km/h${v.group === 'over-limit' ? ` · over the ${s.postedLimitKmh} limit` : ''}`
  return {
    clip: clipName(s.clip) + (s.calibrated ? '' : ' · no calibration'),
    trackId: v.trackId,
    group: v.group,
    verdict,
    thumbnail: v.thumbnailUrl,
    frame: field.points.frame[index],
    t: field.points.t[index],
    confidence: field.points.confidence[index],
    detections: v.detections,
    reason: v.reasonMeaning,
    detail: v.detail,
    errorPercent: v.errorPercent,
    calibrationUal: s.calibrationUal,
    ual: s.ual,
    studyId: s.id,
    calibrationPass: s.group === 'calibration',
  }
}
