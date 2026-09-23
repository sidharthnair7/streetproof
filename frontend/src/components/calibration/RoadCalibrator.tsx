import React, { useRef, useState, useEffect } from 'react'
import { Target, RefreshCw, Layers, Check, Info } from 'lucide-react'
import { CalibrationPoint } from '../../types/study'

interface RoadCalibratorProps {
  distanceMeters?: number
  onDistanceChange?: (d: number) => void
  onPointsChange?: (pts: CalibrationPoint[]) => void
}

const defaultPoints: CalibrationPoint[] = [
  { id: 1, x: 22, y: 40, label: 'Near Left' },
  { id: 2, x: 78, y: 26, label: 'Far Left' },
  { id: 3, x: 84, y: 76, label: 'Far Right' },
  { id: 4, x: 18, y: 84, label: 'Near Right' },
]

export function RoadCalibrator({
  distanceMeters = 8.0,
  onDistanceChange,
  onPointsChange,
}: RoadCalibratorProps) {
  const [points, setPoints] = useState<CalibrationPoint[]>(defaultPoints)
  const [activePoint, setActivePoint] = useState<number | null>(null)
  const [distance, setDistance] = useState(distanceMeters)
  const containerRef = useRef<HTMLDivElement>(null)

  const handlePointerDown = (id: number) => {
    setActivePoint(id)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePoint === null || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const rawX = ((e.clientX - rect.left) / rect.width) * 100
    const rawY = ((e.clientY - rect.top) / rect.height) * 100

    const clampedX = Math.max(4, Math.min(96, Math.round(rawX * 10) / 10))
    const clampedY = Math.max(4, Math.min(96, Math.round(rawY * 10) / 10))

    setPoints((prev) => {
      const next = prev.map((p) => (p.id === activePoint ? { ...p, x: clampedX, y: clampedY } : p))
      onPointsChange?.(next)
      return next
    })
  }

  const handlePointerUp = () => {
    setActivePoint(null)
  }

  const resetPoints = () => {
    setPoints(defaultPoints)
    onPointsChange?.(defaultPoints)
  }

  // Calculate polygon SVG path
  const polygonPoints = points.map((p) => `${p.x}%,${p.y}%`).join(' ')

  // Calculate pixel distance between point 1 and point 2 for scale reference
  const p1 = points[0]
  const p2 = points[1]
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const percentDist = Math.sqrt(dx * dx + dy * dy)
  const pixelsPerMeter = (percentDist * 5.4 / distance).toFixed(1)

  return (
    <div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
      {/* Interactive Video Frame Canvas */}
      <div className="panel overflow-hidden rounded-2xl">
        <div className="border-b border-[#e1e9e7] bg-[#f8faf9] px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="live-dot h-2 w-2 rounded-full bg-[#3bb9a3]" />
            <span className="mono text-[11px] font-semibold text-[#182f35]">Interactive Homography Overlay</span>
          </div>
          <span className="mono text-[9px] uppercase tracking-wider text-[#6e8582]">Drag 4 pins to align</span>
        </div>

        <div
          ref={containerRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="relative h-[380px] w-full select-none overflow-hidden bg-[#182b30] cursor-crosshair"
        >
          {/* Simulated Road Asphalt & Perspective Gradient */}
          <div
            className="absolute inset-0 opacity-75"
            style={{
              backgroundImage: 'linear-gradient(150deg, #4f6662 0%, #2f4448 40%, #15272c 100%)',
            }}
          />

          {/* Perspective Road Markings */}
          <div className="absolute left-[-15%] top-[48%] h-[2px] w-[140%] -rotate-[14deg] bg-white/20" />
          <div className="absolute left-[-15%] top-[68%] h-[2px] w-[140%] -rotate-[14deg] bg-white/20" />
          <div className="absolute left-[20%] top-[58%] h-0 w-[60%] border-t-2 border-dashed border-[#f5c879]/70 -rotate-[14deg]" />

          {/* Calibrated Road Plane Polygon & Grid (SVG) */}
          <svg className="absolute inset-0 h-full w-full pointer-events-none">
            <polygon
              points={polygonPoints}
              fill="rgba(59, 185, 163, 0.15)"
              stroke="#3bb9a3"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            {/* Interior Perspective Subdivision Lines */}
            <line
              x1={`${(points[0].x + points[3].x) / 2}%`}
              y1={`${(points[0].y + points[3].y) / 2}%`}
              x2={`${(points[1].x + points[2].x) / 2}%`}
              y2={`${(points[1].y + points[2].y) / 2}%`}
              stroke="rgba(156, 227, 210, 0.4)"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            <line
              x1={`${(points[0].x + points[1].x) / 2}%`}
              y1={`${(points[0].y + points[1].y) / 2}%`}
              x2={`${(points[3].x + points[2].x) / 2}%`}
              y2={`${(points[3].y + points[2].y) / 2}%`}
              stroke="rgba(156, 227, 210, 0.4)"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            {/* Real-world Reference Measurement line between Pin 1 and Pin 2 */}
            <line
              x1={`${points[0].x}%`}
              y1={`${points[0].y}%`}
              x2={`${points[1].x}%`}
              y2={`${points[1].y}%`}
              stroke="#f5c879"
              strokeWidth="3"
            />
          </svg>

          {/* Draggable Corner Handles */}
          {points.map((pt) => {
            const isDragging = activePoint === pt.id
            return (
              <div
                key={pt.id}
                onPointerDown={() => handlePointerDown(pt.id)}
                style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing touch-none z-20"
              >
                {/* Ping wave animation when idle */}
                <span className={`absolute -inset-2.5 rounded-full bg-[#3bb9a3]/30 ${isDragging ? 'scale-125' : 'animate-ping'}`} />

                {/* Handle Pin Badge */}
                <div
                  className={`relative flex h-8 w-8 items-center justify-center rounded-full border-2 shadow-lg transition-transform ${
                    isDragging
                      ? 'scale-125 border-white bg-[#148372] text-white shadow-[#3bb9a3]/50'
                      : 'border-[#9ce3d2] bg-[#126b6a] text-white hover:scale-110'
                  }`}
                >
                  <span className="mono text-[11px] font-bold">{pt.id}</span>
                </div>

                {/* Tooltip info */}
                <div className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#0a1e22]/90 px-1.5 py-0.5 mono text-[8px] text-[#9ce3d2] backdrop-blur-sm">
                  {pt.x.toFixed(0)}%, {pt.y.toFixed(0)}%
                </div>
              </div>
            )
          })}

          {/* Reference Measurement Indicator Pill */}
          <div
            style={{
              left: `${(points[0].x + points[1].x) / 2}%`,
              top: `${(points[0].y + points[1].y) / 2 - 6}%`,
            }}
            className="absolute -translate-x-1/2 rounded-full border border-[#f5c879] bg-[#1d2729]/90 px-2 py-0.5 mono text-[9px] font-bold text-[#f5c879] shadow-md backdrop-blur-sm pointer-events-none"
          >
            {distance}m reference
          </div>

          {/* Bottom HUD bar */}
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between rounded-lg bg-[#0e2126]/85 px-3 py-2 text-white backdrop-blur-md">
            <span className="mono text-[9px] text-[#97c4ba]">HOMOGRAPHY: CONVERGED · 4 PINS LOCKED</span>
            <span className="mono text-[9px] text-[#f5c879]">{pixelsPerMeter} px/m scale</span>
          </div>
        </div>

        {/* Action footer */}
        <div className="flex items-center justify-between border-t border-[#e1e9e7] px-5 py-3">
          <div className="flex items-center gap-2 text-[11px] text-[#637776]">
            <Target size={14} className="text-[#398f81]" />
            <span>Planar projection mode active</span>
          </div>
          <button
            onClick={resetPoints}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-[#25766d] hover:text-[#144741]"
          >
            <RefreshCw size={12} /> Reset default pins
          </button>
        </div>
      </div>

      {/* Right Column: Distance Metric & Real-time Bird's-Eye View Minimap */}
      <div className="space-y-4">
        {/* Scale Configuration Card */}
        <div className="panel rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-[#18232a]">Reference Metric</h3>
            <span className="rounded-full bg-[#e8f6f2] px-2.5 py-0.5 mono text-[10px] font-semibold text-[#22776b]">
              Pin 1 → 2
            </span>
          </div>

          <label className="block mb-4">
            <div className="mb-1.5 flex justify-between text-[11px]">
              <span className="font-semibold text-[#485756]">Ground Distance</span>
              <span className="mono text-[#7b8a89]">real-world tape measurement</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                min="2"
                max="50"
                value={distance}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 8
                  setDistance(val)
                  onDistanceChange?.(val)
                }}
                className="w-full rounded-xl border border-[#cddad7] bg-white px-3 py-2 text-[14px] font-medium outline-none focus:border-[#3bb9a3] focus:ring-2 focus:ring-[#3bb9a3]/20"
              />
              <span className="rounded-xl border border-[#dce5e3] bg-[#f8faf9] px-3 py-2 text-[12px] font-semibold text-[#667776]">
                metres
              </span>
            </div>
          </label>

          <div className="rounded-xl bg-[#edf6f3] p-3 text-[10px] leading-relaxed text-[#516b67] flex gap-2">
            <Info size={14} className="shrink-0 text-[#2f8879] mt-0.5" />
            <span>
              Use standard markings: a full cycle of white road lane dashes (usually 3m dash + 5m gap = 8m in urban zones), or a known driveway width.
            </span>
          </div>
        </div>

        {/* Real-time Bird's-Eye View (BEV) Orthogonal Minimap */}
        <div className="panel rounded-2xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-[#3bb9a3]" />
              <h3 className="text-[13px] font-semibold text-[#18232a]">Orthogonal Bird's-Eye Rectification</h3>
            </div>
            <span className="mono text-[9px] text-[#869796]">Top-down view</span>
          </div>

          <div className="relative h-[150px] w-full overflow-hidden rounded-xl border border-[#d8e5e2] bg-[#1a2d32]">
            {/* Rectified Road Canvas with metric markers */}
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(156,227,210,0.06)_100%)]" />
            
            {/* Metric distance tick lines */}
            <div className="absolute inset-x-4 top-[15%] h-px bg-white/20 flex justify-between mono text-[8px] text-[#97beb6]">
              <span>0m</span>
              <span>{(distance / 2).toFixed(1)}m</span>
              <span>{distance.toFixed(1)}m</span>
            </div>
            <div className="absolute inset-x-4 top-[50%] h-px border-t border-dashed border-[#3bb9a3]/30" />
            <div className="absolute inset-x-4 bottom-[15%] h-px bg-white/20 flex justify-between mono text-[8px] text-[#97beb6]">
              <span>0m</span>
              <span>{(distance / 2).toFixed(1)}m</span>
              <span>{distance.toFixed(1)}m</span>
            </div>

            {/* Vehicle trajectory representation moving linearly in rectified space */}
            <div className="absolute top-[38%] left-[25%] flex items-center gap-1.5 rounded bg-[#157266] px-2 py-0.5 mono text-[8px] text-white shadow-md">
              <span>CAR-14</span>
              <span className="text-[#9ce3d2]">48.7 km/h</span>
            </div>
            <div className="absolute top-[62%] right-[28%] flex items-center gap-1.5 rounded bg-[#a25d2e] px-2 py-0.5 mono text-[8px] text-white opacity-80">
              <span>CAR-18</span>
              <span className="text-[#fcd9b0]">refused</span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-[#697d7c]">
            <span>Geometric Distortion Index</span>
            <span className="font-semibold text-[#27786b]">1.04 · Optimal</span>
          </div>
        </div>
      </div>
    </div>
  )
}
