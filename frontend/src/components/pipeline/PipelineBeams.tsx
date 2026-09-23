import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CloudUpload, Cpu, ShieldCheck, Database, Check, Zap, Terminal, Activity } from 'lucide-react'
import { AnimatedCounter } from '../common/AnimatedCounter'

interface PipelineBeamsProps {
  onComplete?: () => void
  isProcessing?: boolean
}

export function PipelineBeams({ onComplete, isProcessing = true }: PipelineBeamsProps) {
  const [activeStep, setActiveStep] = useState(1)
  const [logs, setLogs] = useState<string[]>([
    'INIT: Camera metadata locked (30.00 fps, 1080p, H.264)',
    'INGEST: Uploading cedar-avenue-pass.mp4 chunk stream to Livepeer AI Gateway',
  ])
  const [frameProgress, setFrameProgress] = useState(180)
  const [isDone, setIsDone] = useState(false)

  // Simulation effect for stream progression
  useEffect(() => {
    if (!isProcessing || isDone) return

    const interval = setInterval(() => {
      setFrameProgress((prev) => {
        if (prev >= 540) {
          setIsDone(true)
          setActiveStep(4)
          clearInterval(interval)
          onComplete?.()
          return 540
        }
        const next = prev + 36
        if (next > 200 && next < 380) setActiveStep(2)
        if (next >= 380 && next < 520) setActiveStep(3)
        if (next >= 520) setActiveStep(4)

        // Append real-time logs
        const logEntries = [
          `LIVEPEER: Batch [${next - 36}-${next}] processed via node 0x8f2a (latency: 38ms)`,
          `KALMAN: Linked 3 continuous trajectories across calibrated plane`,
          `GATES: Evaluated track CAR-21 · window spread 4.2% · PASSED GATE 05`,
          `GATES: Evaluated track CAR-18 · duration 8 frames (<12) · REFUSED GATE 03`,
        ]
        const randomLog = logEntries[Math.floor(Math.random() * logEntries.length)]
        setLogs((l) => [randomLog, ...l.slice(0, 7)])

        return next
      })
    }, 450)

    return () => clearInterval(interval)
  }, [isProcessing, isDone, onComplete])

  const nodes = [
    {
      id: 1,
      name: 'Video Ingest',
      sub: '30 fps metadata',
      icon: CloudUpload,
      activeColor: '#3bb9a3',
    },
    {
      id: 2,
      name: 'Livepeer YOLO',
      sub: 'yolo-detect worker',
      icon: Cpu,
      activeColor: '#9ce3d2',
    },
    {
      id: 3,
      name: 'Proof Gate Filter',
      sub: '6 deterministic rules',
      icon: ShieldCheck,
      activeColor: '#ec8a45',
    },
    {
      id: 4,
      name: 'OriginTrail DKG',
      sub: 'knowledge asset',
      icon: Database,
      activeColor: '#3bb9a3',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Magic UI Multi-Node Animated Beam Pipeline */}
      <div className="relative overflow-hidden rounded-2xl border border-[#d6e5e1] bg-[#122428] p-6 text-white shadow-xl">
        {/* Subtle grid backdrop */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(156,227,210,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(156,227,210,0.05)_1px,transparent_1px)] bg-[size:28px_28px]" />

        <div className="relative z-10 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="live-dot h-2.5 w-2.5 rounded-full bg-[#9ce3d2]" />
            <span className="mono text-[11px] uppercase tracking-wider text-[#9ce3d2]">
              Live Forensic Pipeline Stream
            </span>
          </div>
          <div className="mono text-[10px] text-[#86a8a2]">
            FRAME <span className="text-white font-bold">{frameProgress}</span> / 540
          </div>
        </div>

        {/* Nodes and SVG Connecting Beams */}
        <div className="relative z-10 py-6">
          {/* Animated Connecting SVG Beams */}
          <div className="absolute left-[12%] right-[12%] top-[48px] h-3 -translate-y-1/2 pointer-events-none">
            <svg className="h-full w-full overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id="beamGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#255550" />
                  <stop offset="50%" stopColor="#9ce3d2" />
                  <stop offset="100%" stopColor="#255550" />
                </linearGradient>
              </defs>

              {/* Background Wire */}
              <line x1="0%" y1="50%" x2="100%" y2="50%" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />

              {/* Animated Glowing Pulses */}
              <motion.line
                x1="0%"
                y1="50%"
                x2="100%"
                y2="50%"
                stroke="url(#beamGradient)"
                strokeWidth="4"
                strokeDasharray="40 120"
                animate={{ strokeDashoffset: [-160, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
              />
            </svg>
          </div>

          {/* Nodes Row */}
          <div className="grid grid-cols-4 gap-4 relative">
            {nodes.map((node) => {
              const isPassed = activeStep > node.id || isDone
              const isCurrent = activeStep === node.id && !isDone
              const Icon = node.icon

              return (
                <div key={node.id} className="flex flex-col items-center text-center">
                  <div className="relative mb-3">
                    {/* Ring aura if currently processing */}
                    {isCurrent && (
                      <span className="absolute -inset-2.5 animate-ping rounded-full bg-[#9ce3d2]/25" />
                    )}

                    <div
                      className={`relative flex h-14 w-14 items-center justify-center rounded-2xl border-2 transition-all duration-300 shadow-md ${
                        isPassed
                          ? 'border-[#9ce3d2] bg-[#1a4a4b] text-[#9ce3d2]'
                          : isCurrent
                          ? 'border-white bg-[#276e6a] text-white shadow-[0_0_20px_rgba(156,227,210,0.5)] scale-110'
                          : 'border-white/10 bg-[#162f34] text-white/40'
                      }`}
                    >
                      {isPassed ? <Check size={20} strokeWidth={2.5} /> : <Icon size={20} />}
                    </div>
                  </div>

                  <span className="text-[12px] font-semibold text-white tracking-tight">{node.name}</span>
                  <span className="mono mt-1 text-[9px] text-[#7daaa2]">{node.sub}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Real-time Progress Bar */}
        <div className="relative z-10 mt-6 pt-4 border-t border-white/10 flex items-center gap-4">
          <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#17786b] to-[#9ce3d2] rounded-full"
              style={{ width: `${(frameProgress / 540) * 100}%` }}
              transition={{ ease: 'easeOut', duration: 0.3 }}
            />
          </div>
          <span className="mono text-[11px] font-bold text-[#9ce3d2]">
            {Math.round((frameProgress / 540) * 100)}%
          </span>
        </div>
      </div>

      {/* Live Telemetry Terminal & Inference Call Meter */}
      <div className="grid gap-5 md:grid-cols-[1.3fr_.7fr]">
        {/* Real-time Stream Terminal */}
        <div className="rounded-2xl border border-[#d6e5e1] bg-[#0c1c20] p-4 text-[#8dc7bc] shadow-md font-mono text-[10px]">
          <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2 text-white">
              <Terminal size={14} className="text-[#9ce3d2]" />
              <span className="text-[11px] font-bold">TELEMETRY STREAM LOGS</span>
            </div>
            <span className="flex items-center gap-1.5 text-[9px] text-[#9ce3d2]">
              <Activity size={12} className="animate-pulse" /> LIVE 30 FPS
            </span>
          </div>

          <div className="space-y-1.5 h-[145px] overflow-hidden flex flex-col justify-end">
            {logs.map((log, idx) => (
              <div key={idx} className="truncate">
                <span className="text-[#497f76] mr-2">[{new Date().toLocaleTimeString()}]</span>
                <span className={log.includes('REFUSED') ? 'text-[#f5a76c]' : log.includes('PASSED') ? 'text-[#9ce3d2]' : 'text-gray-300'}>
                  {log}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Livepeer Meter & Proven Gate Counts */}
        <div className="panel rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="eyebrow">Livepeer Compute Meter</span>
              <span className="rounded-full bg-[#dff5ec] px-2 py-0.5 mono text-[9px] font-bold text-[#1e6f63]">
                yolo-detect
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-4">
              <span className="stat-number text-3xl font-medium text-[#18232a]">
                $<AnimatedCounter value={isDone ? '0.030' : (frameProgress * 0.000055).toFixed(3)} decimals={3} />
              </span>
              <span className="text-[11px] text-[#6d7e7d]">USD billed compute</span>
            </div>

            <div className="space-y-2 text-[11px] border-t border-[#e2ece9] pt-3 text-[#536866]">
              <div className="flex justify-between">
                <span>Total Calls</span>
                <span className="font-semibold text-[#18232a]">30 batches</span>
              </div>
              <div className="flex justify-between">
                <span>Inference Latency</span>
                <span className="mono text-[#25766c]">~38ms / frame</span>
              </div>
              <div className="flex justify-between">
                <span>Proven Speeds</span>
                <span className="font-semibold text-[#25766c]">32 of 48 passed</span>
              </div>
            </div>
          </div>

          {!isDone && (
            <button
              onClick={() => {
                setFrameProgress(540)
                setIsDone(true)
                setActiveStep(4)
                onComplete?.()
              }}
              className="btn btn-dark mt-4 w-full"
            >
              <Zap size={14} /> Fast-Forward Simulation
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
