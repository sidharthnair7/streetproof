import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, ShieldCheck, AlertCircle, Scan, Eye } from 'lucide-react'
import { VehicleDetection } from '../../types/study'

interface TelemetryPlayerProps {
  initialFrame?: number
  onSelectVehicle?: (id: string) => void
}

// Sample realistic vehicle trajectories moving across 540 frames
const vehiclesData: VehicleDetection[] = [
  {
    id: 'CAR-14',
    speedKmh: 48.7,
    confidence: 0.94,
    status: 'proven',
    trajectory: [
      { frame: 60, x: 22, y: 35, w: 80, h: 75, speed: 48.2 },
      { frame: 120, x: 34, y: 44, w: 92, h: 86, speed: 48.7 },
      { frame: 180, x: 48, y: 55, w: 104, h: 96, speed: 48.9 },
      { frame: 240, x: 64, y: 68, w: 118, h: 108, speed: 48.7 },
    ],
  },
  {
    id: 'CAR-18',
    speedKmh: 41.0,
    confidence: 0.81,
    status: 'refused',
    refusalReason: 'track_too_short',
    refusalDetail: 'Track lost after 8 frames (< 12 frame gate threshold)',
    trajectory: [
      { frame: 140, x: 66, y: 52, w: 68, h: 62, speed: 41.0 },
      { frame: 170, x: 74, y: 58, w: 72, h: 66, speed: 41.2 },
    ],
  },
  {
    id: 'CAR-21',
    speedKmh: 36.4,
    confidence: 0.96,
    status: 'proven',
    trajectory: [
      { frame: 220, x: 18, y: 38, w: 78, h: 72, speed: 36.1 },
      { frame: 300, x: 38, y: 52, w: 90, h: 84, speed: 36.4 },
      { frame: 380, x: 58, y: 66, w: 106, h: 98, speed: 36.5 },
    ],
  },
  {
    id: 'CAR-25',
    speedKmh: 52.1,
    confidence: 0.92,
    status: 'proven',
    trajectory: [
      { frame: 340, x: 26, y: 34, w: 82, h: 76, speed: 51.8 },
      { frame: 420, x: 46, y: 49, w: 98, h: 90, speed: 52.1 },
      { frame: 500, x: 70, y: 66, w: 114, h: 104, speed: 52.4 },
    ],
  },
]

export function TelemetryPlayer({ initialFrame = 140, onSelectVehicle }: TelemetryPlayerProps) {
  const [currentFrame, setCurrentFrame] = useState(initialFrame)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showRadar, setShowRadar] = useState(true)
  const [showMesh, setShowMesh] = useState(true)
  const animRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isPlaying) {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      return
    }

    let lastTime = performance.now()
    const loop = (now: number) => {
      const delta = now - lastTime
      if (delta >= 33.3) {
        // approx 30 fps
        setCurrentFrame((prev) => (prev >= 538 ? 0 : prev + 2))
        lastTime = now
      }
      animRef.current = requestAnimationFrame(loop)
    }

    animRef.current = requestAnimationFrame(loop)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [isPlaying])

  // Get active vehicles at current frame by linear interpolation between keyframes
  const activeVehicles = vehiclesData
    .map((veh) => {
      const traj = veh.trajectory
      const first = traj[0]
      const last = traj[traj.length - 1]

      if (currentFrame < first.frame - 15 || currentFrame > last.frame + 15) return null

      // Find surrounding keyframes
      let p1 = traj[0]
      let p2 = traj[traj.length - 1]

      for (let i = 0; i < traj.length - 1; i++) {
        if (currentFrame >= traj[i].frame && currentFrame <= traj[i + 1].frame) {
          p1 = traj[i]
          p2 = traj[i + 1]
          break
        }
      }

      const ratio = p2.frame === p1.frame ? 0 : Math.max(0, Math.min(1, (currentFrame - p1.frame) / (p2.frame - p1.frame)))
      const x = p1.x + (p2.x - p1.x) * ratio
      const y = p1.y + (p2.y - p1.y) * ratio
      const w = p1.w + (p2.w - p1.w) * ratio
      const h = p1.h + (p2.h - p1.h) * ratio

      return {
        ...veh,
        currentPos: { x, y, w, h },
      }
    })
    .filter(Boolean)

  const seconds = (currentFrame / 30).toFixed(1)

  return (
    <div className="panel overflow-hidden rounded-2xl">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#e1e9e7] bg-[#f8faf9] px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="live-dot h-2 w-2 rounded-full bg-[#3bb9a3]" />
          <span className="text-[13px] font-semibold text-[#18232a]">Annotated Evidence Playback</span>
          <span className="rounded bg-[#e7f5ef] px-2 py-0.5 mono text-[9px] font-bold text-[#1f7365]">
            cedar-avenue-pass.mp4
          </span>
        </div>
        <div className="flex items-center gap-3 mono text-[10px] text-[#718583]">
          <span>{seconds}s / 18.0s</span>
          <span className="text-black font-semibold">FRAME {currentFrame}</span> / 540
        </div>
      </div>

      {/* Video Viewport with Animated Vehicles and Telemetry */}
      <div className="relative h-[340px] w-full overflow-hidden bg-[#182e34] select-none">
        {/* Asphalt gradient background */}
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage: 'linear-gradient(150deg, #5b7970 0%, #344c4f 40%, #15292f 100%)',
          }}
        />

        {/* Perspective Road lines */}
        <div className="absolute left-[-10%] top-[46%] h-[2px] w-[130%] -rotate-[13deg] bg-white/25" />
        <div className="absolute left-[-10%] top-[68%] h-[2px] w-[130%] -rotate-[13deg] bg-white/25" />
        <div className="absolute left-[20%] top-[57%] h-0 w-[60%] border-t-2 border-dashed border-[#f5c879]/75 -rotate-[13deg]" />

        {/* Optional LiDAR Perspective Mesh */}
        {showMesh && (
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(160deg, transparent 44%, #9ce3d2 45%, transparent 46%), linear-gradient(160deg, transparent 64%, #9ce3d2 65%, transparent 66%)',
            }}
          />
        )}

        {/* Optional Radar Scan Line Sweep */}
        {showRadar && (
          <div className="scan-line absolute left-0 right-0 top-0 h-px bg-[#9ce3d2] shadow-[0_0_20px_4px_rgba(156,227,210,0.6)] pointer-events-none" />
        )}

        {/* Render Interpolated Moving Vehicle Boxes */}
        {activeVehicles.map((veh) => {
          if (!veh) return null
          const isProven = veh.status === 'proven'
          const pos = veh.currentPos

          return (
            <div
              key={veh.id}
              onClick={() => onSelectVehicle?.(veh.id)}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: `${pos.w}px`,
                height: `${pos.h}px`,
              }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-lg border-2 transition-all duration-75 shadow-lg ${
                isProven
                  ? 'border-[#9ce3d2] shadow-[#9ce3d2]/20 hover:scale-105'
                  : 'border-[#f5a76c] shadow-[#f5a76c]/20 hover:scale-105'
              }`}
            >
              {/* Velocity vector line indicator */}
              <div
                className={`absolute right-[-14px] top-1/2 h-0.5 w-4 ${
                  isProven ? 'bg-[#9ce3d2]' : 'bg-[#f5a76c]'
                }`}
              />

              {/* Vehicle Speed and Gate Tag */}
              <div
                className={`absolute -top-6 left-0 flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-0.5 mono text-[9px] font-bold text-white shadow-md ${
                  isProven ? 'bg-[#187569]' : 'bg-[#a55f31]'
                }`}
              >
                <span>{veh.id}</span>
                <span>·</span>
                <span>{isProven ? `${veh.speedKmh} km/h` : 'REFUSED'}</span>
                {isProven ? <ShieldCheck size={11} /> : <AlertCircle size={11} />}
              </div>

              {/* Confidence badge */}
              <div className="absolute -bottom-5 right-0 rounded bg-[#0b1f23]/90 px-1.5 py-0.5 mono text-[8px] text-[#9ce3d2]">
                {(veh.confidence * 100).toFixed(0)}% conf
              </div>
            </div>
          )
        })}

        {/* Viewport Overlay Controls */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <button
            onClick={() => setShowRadar(!showRadar)}
            className={`rounded-lg border px-2 py-1 mono text-[9px] transition-colors ${
              showRadar
                ? 'border-[#9ce3d2] bg-[#12363b]/80 text-[#9ce3d2]'
                : 'border-white/10 bg-[#0d2226]/80 text-white/50'
            }`}
          >
            <Scan size={11} className="inline mr-1" /> Radar
          </button>
          <button
            onClick={() => setShowMesh(!showMesh)}
            className={`rounded-lg border px-2 py-1 mono text-[9px] transition-colors ${
              showMesh
                ? 'border-[#9ce3d2] bg-[#12363b]/80 text-[#9ce3d2]'
                : 'border-white/10 bg-[#0d2226]/80 text-white/50'
            }`}
          >
            <Eye size={11} className="inline mr-1" /> LiDAR Mesh
          </button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-3 left-4 flex items-center gap-3 rounded-lg bg-[#0e2227]/85 px-3 py-1.5 text-[10px] text-white backdrop-blur-md">
          <span className="flex items-center gap-1.5 text-[#9ce3d2]">
            <span className="h-2 w-2 rounded-full bg-[#9ce3d2]" /> Proven Vector
          </span>
          <span className="flex items-center gap-1.5 text-[#f5a76c]">
            <span className="h-2 w-2 rounded-full bg-[#f5a76c]" /> Refused by Gate
          </span>
        </div>
      </div>

      {/* Scrubbing Timeline & Play Controls */}
      <div className="p-4 bg-white border-t border-[#e5ebea] space-y-3">
        {/* Scrubber Range Slider */}
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0"
            max="540"
            value={currentFrame}
            onChange={(e) => {
              setIsPlaying(false)
              setCurrentFrame(parseInt(e.target.value, 10))
            }}
            className="w-full accent-[#187569] h-2 bg-[#e4edea] rounded-lg cursor-pointer"
          />
        </div>

        {/* Playback Button Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-1.5 rounded-xl bg-[#182b30] px-3.5 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#126b6a]"
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} fill="currentColor" />}
              <span>{isPlaying ? 'Pause' : 'Play Timeline'}</span>
            </button>
            <button
              onClick={() => {
                setIsPlaying(false)
                setCurrentFrame(0)
              }}
              className="rounded-xl border border-[#dce5e3] p-2 text-[#516464] hover:bg-[#f0f5f3]"
              title="Reset to frame 0"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          <div className="mono text-[10px] text-[#788e8c]">
            Active Objects: <span className="font-bold text-[#18232a]">{activeVehicles.length}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
