import { useEffect, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, CloudUpload, Cpu, Database, Film, Gauge, Loader2, ShieldCheck, XCircle } from 'lucide-react'
import { api, clipName, short } from '../api'
import type { StudyStatus, StudyView } from '../api'

interface ProcessingScreenProps {
  studyId: string | null
  onDone: (id: string) => void
  onBack: () => void
}

const STAGES: { status: StudyStatus; label: string; detail: string; icon: typeof Cpu }[] = [
  { status: 'EXTRACTING', label: 'Frames', detail: 'ffmpeg pulls frames at a fixed rate', icon: Film },
  { status: 'DETECTING', label: 'Livepeer', detail: 'yolo-detect boxes every vehicle in every frame', icon: Cpu },
  { status: 'MEASURING', label: 'Track + gate', detail: 'boxes become tracks, tracks become proven or refused', icon: ShieldCheck },
  { status: 'RENDERING', label: 'Evidence', detail: 'annotated video and per-car crops', icon: Gauge },
  { status: 'DONE', label: 'Done', detail: 'ready to publish to the DKG', icon: Database },
]

const ORDER: StudyStatus[] = ['UPLOADED', 'QUEUED', 'EXTRACTING', 'DETECTING', 'MEASURING', 'RENDERING', 'DONE']

function stamp() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function ProcessingScreen({ studyId, onDone, onBack }: ProcessingScreenProps) {
  const [study, setStudy] = useState<StudyView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [log, setLog] = useState<string[]>([])
  const last = useRef<{ status?: StudyStatus; calls: number; frames: number }>({ calls: 0, frames: 0 })

  useEffect(() => {
    if (!studyId) return
    let stopped = false
    let timer = 0
    const poll = async () => {
      try {
        const s = await api.study(studyId)
        if (stopped) return
        setStudy(s)
        const lines: string[] = []
        if (s.status !== last.current.status) {
          if (s.status === 'EXTRACTING') lines.push(`FRAMES  extracting ${clipName(s.sourceName)} at ${s.sampleFps} fps`)
          if (s.status === 'DETECTING') lines.push(`LIVEPEER  run_capability yolo-detect on ${s.progress.framesTotal} frames${s.usedCachedDetections ? ' (cached detections reused)' : ''}`)
          if (s.status === 'MEASURING') lines.push('GATE  tracking boxes and judging every vehicle')
          if (s.status === 'RENDERING') lines.push('EVIDENCE  drawing boxes, trails and verdicts onto the video')
          if (s.status === 'DONE' && s.summary) lines.push(`DONE  ${s.summary.vehiclesProven} of ${s.summary.vehiclesObserved} vehicles proven, ${s.summary.vehiclesRefused} refused`)
          if (s.status === 'FAILED') lines.push(`FAILED  ${s.error ?? 'unknown error'}`)
          last.current.status = s.status
        }
        if (s.status === 'DETECTING' && s.progress.framesDone - last.current.frames >= 15) {
          lines.push(`LIVEPEER  ${s.progress.framesDone}/${s.progress.framesTotal} frames detected · ${s.livepeerCalls} calls`)
          last.current.frames = s.progress.framesDone
        }
        if (lines.length) setLog((prev) => [...lines.map((l) => `${stamp()}  ${l}`).reverse(), ...prev].slice(0, 14))
        if (s.status === 'DONE') {
          timer = window.setTimeout(() => onDone(s.id), 1600)
          return
        }
        if (s.status !== 'FAILED') timer = window.setTimeout(poll, 800)
      } catch (e) {
        if (!stopped) setError(e instanceof Error ? e.message : String(e))
      }
    }
    poll()
    return () => {
      stopped = true
      window.clearTimeout(timer)
    }
  }, [studyId, onDone])

  if (!studyId) {
    return (
      <div className="panel mx-auto max-w-[600px] rounded-2xl p-8 text-center text-[13px] text-[#536363]">
        No study is running. <button onClick={onBack} className="font-semibold text-[#126b6a]">Start one</button>.
      </div>
    )
  }

  const index = study ? ORDER.indexOf(study.status) : 0
  const pct = study && study.progress.framesTotal ? Math.round((study.progress.framesDone / study.progress.framesTotal) * 100) : 0

  return (
    <div className="max-w-[980px] mx-auto space-y-7">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-2">{study ? `${clipName(study.sourceName)} · ${study.id}` : studyId} / live run</div>
          <h2 className="display text-4xl leading-tight md:text-5xl text-[#18232a]">
            Reading the street.
            <br />
            <em className="text-[#126b6a]">Refusing weak numbers.</em>
          </h2>
        </div>
        {study?.status === 'DONE' && (
          <div className="flex items-center gap-2 rounded-xl bg-[#d9f3e9] px-4 py-2 text-[13px] font-bold text-[#1f7365] shadow-sm">
            <CheckCircle2 size={16} /> Measured
          </div>
        )}
        {study?.status === 'FAILED' && (
          <div className="flex items-center gap-2 rounded-xl bg-[#fbe4df] px-4 py-2 text-[13px] font-bold text-[#b1462f] shadow-sm">
            <XCircle size={16} /> Failed
          </div>
        )}
      </div>

      <div className="panel rounded-2xl p-6">
        <div className="grid gap-3 md:grid-cols-5">
          {STAGES.map((stage) => {
            const stageIndex = ORDER.indexOf(stage.status)
            const state = study?.status === 'FAILED' ? 'idle' : index > stageIndex || study?.status === 'DONE' ? 'done' : index === stageIndex ? 'active' : 'idle'
            const Icon = stage.icon
            return (
              <div key={stage.status} className={`rounded-xl border p-4 transition-colors ${state === 'active' ? 'border-[#1b7a74] bg-[#effaf5]' : state === 'done' ? 'border-[#cfe6df] bg-white' : 'border-[#e3eae8] bg-white/60'}`}>
                <div className="mb-3 flex items-center justify-between">
                  <span className={`grid h-8 w-8 place-items-center rounded-lg ${state === 'idle' ? 'bg-[#eef3f2] text-[#576361]' : 'bg-[#dff3eb] text-[#1b7a74]'}`}>
                    {state === 'active' ? <Loader2 size={15} className="animate-spin" /> : state === 'done' ? <CheckCircle2 size={15} /> : <Icon size={15} />}
                  </span>
                  <span className="mono text-[11px] uppercase tracking-wider text-[#586362]">{stage.status.toLowerCase()}</span>
                </div>
                <div className="text-[13px] font-semibold text-[#18232a]">{stage.label}</div>
                <div className="mt-1 text-[12.5px] leading-snug text-[#556464]">{stage.detail}</div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-[#f6faf8] p-4">
            <div className="eyebrow mb-2">Frames detected</div>
            <div className="stat-number text-2xl text-[#18232a]">{study ? `${study.progress.framesDone} / ${study.progress.framesTotal || '…'}` : '…'}</div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#dbe8e4]">
              <div className="h-full bg-[#3bb9a3] transition-all duration-300" style={{ width: `${study?.status === 'DONE' ? 100 : pct}%` }} />
            </div>
          </div>
          <div className="rounded-xl bg-[#f6faf8] p-4">
            <div className="eyebrow mb-2">Livepeer calls</div>
            <div className="stat-number text-2xl text-[#18232a]">{study?.livepeerCalls ?? 0}</div>
            <div className="mt-2 text-[12.5px] text-[#556464]">{study?.usedCachedDetections ? 'Detections reused from an earlier run of this exact video' : 'upload + run_capability per frame'}</div>
          </div>
          <div className="rounded-xl bg-[#f6faf8] p-4">
            <div className="eyebrow mb-2">Calibration</div>
            <div className="text-[13px] font-semibold text-[#18232a]">
              {study?.calibrationUal ? 'Loaded from the DKG' : study?.calibration ? study.calibration.mode.toLowerCase().replace('_', ' ') : 'None'}
            </div>
            <div className="mono mt-2 break-all text-[12px] text-[#556464]">{study?.calibrationUal ? short(study.calibrationUal, 22, 10) : study ? `sha256 ${short(study.videoSha256, 12, 8)}` : ''}</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-[#11222a] p-5 text-[#b5c9c7] shadow-xl">
        <div className="mb-3 flex items-center gap-2 eyebrow text-[#7fb3a9]"><CloudUpload size={12} /> run log</div>
        <div className="mono space-y-1.5 text-[12.5px] leading-relaxed">
          {log.map((l, i) => (
            <div key={i} className={i === 0 ? 'text-[#dff5ee]' : 'text-[#7f9c98]'}>{l}</div>
          ))}
          {log.length === 0 && <div>waiting for the server…</div>}
          {error && <div className="text-[#f0a597]">{error}</div>}
          {study?.status === 'FAILED' && <div className="text-[#f0a597]">{study.error}</div>}
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={() => study && onDone(study.id)} disabled={study?.status !== 'DONE'} className={`btn ${study?.status === 'DONE' ? 'btn-dark shadow-xl' : 'btn-light opacity-60'}`}>
          <span>Open the results</span>
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  )
}
