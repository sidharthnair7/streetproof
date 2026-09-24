import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, CloudUpload, Database, FileVideo, Info, Loader2, Play, Ruler, ShieldCheck, Target, XCircle } from 'lucide-react'
import { api, short } from '../api'
import type { CalibrationRecord, RunRequest, SampleClip, StudyView } from '../api'
import { GATES } from '../gates'

interface NewStudyScreenProps {
  onStarted: (id: string) => void
}

type Mode = 'dkg' | 'curb' | 'length' | 'none'

export function NewStudyScreen({ onStarted }: NewStudyScreenProps) {
  const [step, setStep] = useState(0)
  const [samples, setSamples] = useState<SampleClip[]>([])
  const [study, setStudy] = useState<StudyView | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [calibrations, setCalibrations] = useState<CalibrationRecord[]>([])
  const [mode, setMode] = useState<Mode>('curb')
  const [calibrationRef, setCalibrationRef] = useState<string>('')
  const [height, setHeight] = useState(1.5)
  const [carLength, setCarLength] = useState(4.5)
  const [marks, setMarks] = useState<{ x: number; y: number }[]>([])
  const [markMetres, setMarkMetres] = useState(10)
  const [limit, setLimit] = useState(50)
  const [street, setStreet] = useState('')
  const [known, setKnown] = useState('')
  const [conditions, setConditions] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    api.samples().then((s) => setSamples(s.filter((c) => c.ready))).catch(() => undefined)
    api.calibrations().then((c) => {
      const onDkg = c.filter((x) => x.ual)
      setCalibrations(onDkg)
      if (onDkg[0]) setCalibrationRef(onDkg[0].ual as string)
    }).catch(() => undefined)
  }, [])

  const fail = (e: unknown) => {
    setBusy(null)
    setError(e instanceof Error ? e.message : String(e))
  }

  const runSample = async (clip: SampleClip) => {
    setError(null)
    setBusy(clip.name)
    try {
      const created = await api.fromSample(clip.name)
      if (created.status === 'UPLOADED') {
        setStudy(created)
        setStep(1)
        setBusy(null)
      } else {
        onStarted(created.id)
      }
    } catch (e) {
      fail(e)
    }
  }

  const upload = async (file: File) => {
    setError(null)
    setBusy('upload')
    try {
      const created = await api.upload(file)
      setStudy(created)
      setStep(1)
      setBusy(null)
    } catch (e) {
      fail(e)
    }
  }

  const placeMark = (event: React.MouseEvent<HTMLImageElement>) => {
    const img = imageRef.current
    if (!img) return
    const rect = img.getBoundingClientRect()
    const x = Math.round(((event.clientX - rect.left) / rect.width) * img.naturalWidth)
    const y = Math.round(((event.clientY - rect.top) / rect.height) * img.naturalHeight)
    setMarks((prev) => (prev.length >= 2 ? [{ x, y }] : [...prev, { x, y }]))
  }

  const run = async () => {
    if (!study) return
    setError(null)
    setBusy('run')
    const body: RunRequest = {
      postedLimitKmh: limit,
      streetLabel: street.trim() || null,
      knownKmh: known.trim() ? Number(known) : null,
      checkConditions: conditions,
    }
    if (mode === 'dkg') {
      body.calibrationRef = calibrationRef
      body.vehicleHeightMetres = height
    } else if (mode === 'curb' && marks.length === 2) {
      body.calibration = { mode: 'CURB_MARKS', x1: marks[0].x, y1: marks[0].y, x2: marks[1].x, y2: marks[1].y, metres: markMetres }
    } else if (mode === 'length') {
      body.calibration = { mode: 'VEHICLE_LENGTH', metres: carLength }
    }
    try {
      await api.run(study.id, body)
      onStarted(study.id)
    } catch (e) {
      fail(e)
    }
  }

  const chosen = calibrations.find((c) => c.ual === calibrationRef)
  const canRun = mode !== 'curb' || marks.length === 2
  const steps = ['Choose footage', 'Calibrate', 'Run the gate']

  return (
    <div className="max-w-[1000px] mx-auto space-y-6">
      <div>
        <div className="eyebrow mb-2">New speed study</div>
        <h2 className="display text-4xl leading-tight md:text-5xl text-[#18232a]">
          Measure your street.
          <br />
          <em className="text-[#126b6a]">Keep only what holds up.</em>
        </h2>
        <p className="mt-3 max-w-[600px] text-[13px] leading-6 text-[#627574]">
          Every frame goes to Livepeer's yolo-detect. StreetProof tracks the boxes locally, measures each car, and refuses any speed the evidence cannot support.
        </p>
      </div>

      <div className="flex max-w-[640px] items-center pt-2">
        {steps.map((s, i) => (
          <div key={s} className="flex flex-1 items-center">
            <div className={`flex items-center gap-2 text-[12px] font-semibold ${step >= i ? 'text-[#126b6a]' : 'text-[#9cb0ae]'}`}>
              <span className={`grid h-8 w-8 place-items-center rounded-full border text-[11px] font-bold ${step > i ? 'border-[#3bb9a3] bg-[#d9f3e9] text-[#237568]' : step === i ? 'border-[#1b7a74] bg-[#1b7a74] text-white shadow-md' : 'border-[#d3dedd] bg-white text-[#9cb0ae]'}`}>
                {step > i ? <Check size={14} /> : i + 1}
              </span>
              <span className="hidden sm:inline">{s}</span>
            </div>
            {i < 2 && <div className={`mx-3 h-0.5 flex-1 ${step > i ? 'bg-[#3bb9a3]' : 'bg-[#dce5e3]'}`} />}
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-[#f1c8bd] bg-[#fdf1ee] px-4 py-3 text-[12px] text-[#9b3d2a]">
          <XCircle size={15} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {step === 0 && (
        <div className="grid gap-5 md:grid-cols-[1.15fr_.85fr]">
          <div className="panel rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-semibold text-[#18232a]">Test clips with a known speed</h3>
                <p className="text-[11px] text-[#718584]">VS13 sample clips: each car held a known speed on cruise control. One click runs it with the calibration stored on the DKG.</p>
              </div>
              <FileVideo size={22} className="shrink-0 text-[#497f77]" />
            </div>
            <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
              {samples.map((clip) => (
                <button
                  key={clip.name}
                  onClick={() => runSample(clip)}
                  disabled={busy !== null}
                  className="hover-lift flex w-full items-center justify-between gap-3 rounded-xl border border-[#dce5e3] bg-white px-4 py-3 text-left disabled:opacity-60"
                >
                  <div>
                    <div className="text-[12px] font-semibold text-[#18232a]">{clip.title}</div>
                    <div className="mono text-[10px] text-[#869998]">{clip.name}</div>
                  </div>
                  {busy === clip.name ? <Loader2 size={15} className="animate-spin text-[#1b7a74]" /> : <Play size={14} className="text-[#1b7a74]" />}
                </button>
              ))}
              {samples.length === 0 && <div className="text-[12px] text-[#718584]">No sample clips found in the server's samples folder.</div>}
            </div>
            <div className="text-[10px] leading-relaxed text-[#8a9a99]">{samples[0]?.credit}</div>
          </div>

          <div className="panel rounded-2xl p-6 space-y-4">
            <h3 className="text-[15px] font-semibold text-[#18232a]">Or upload your own street</h3>
            <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy !== null}
              className="group flex min-h-[200px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#c6d7d4] bg-[#fafdfe] p-6 transition-all hover:border-[#3bb9a3] hover:bg-[#f3f9f7] disabled:opacity-60"
            >
              <span className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-[#e8f2f0] text-[#277c71]">
                {busy === 'upload' ? <Loader2 size={24} className="animate-spin" /> : <CloudUpload size={24} />}
              </span>
              <div className="text-[14px] font-semibold text-[#18232a]">{busy === 'upload' ? 'Uploading…' : 'Choose a video'}</div>
              <div className="mt-1 text-[12px] text-[#718584]">Fixed camera · MP4 or MOV · up to 60 s</div>
            </button>
            <div className="space-y-2.5 text-[11px] text-[#687f7d]">
              {[
                ['Keep the camera still', 'A tripod, or a phone wedged in a window.'],
                ['Get the whole car in view', 'Cars cut off by the frame edge are refused.'],
                ['Know one distance', 'Two road marks a known distance apart, or use a stored calibration.'],
              ].map(([t, d]) => (
                <div key={t} className="flex gap-2.5">
                  <Check size={14} className="mt-0.5 shrink-0 text-[#2c8374]" />
                  <span><b className="text-[#18232a]">{t}.</b> {d}</span>
                </div>
              ))}
              <div className="flex gap-2.5">
                <Info size={14} className="mt-0.5 shrink-0 text-[#369687]" />
                <span>The video stays on this server. Only its SHA-256 fingerprint and the results are published.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 1 && study && (
        <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
          <div className="panel rounded-2xl p-6 space-y-4">
            <h3 className="text-[15px] font-semibold text-[#18232a]">How should pixels become metres?</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {([
                ['dkg', Database, 'Calibration from the DKG', 'Same camera and position only'],
                ['curb', Target, 'Two marks on the road', 'Click two points a known distance apart'],
                ['length', Ruler, 'Typical car length', 'Side-on footage, rougher'],
                ['none', XCircle, 'No calibration', 'See what the gate refuses'],
              ] as [Mode, typeof Database, string, string][]).map(([id, Icon, title, sub]) => (
                <button key={id} onClick={() => setMode(id)} className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${mode === id ? 'border-[#1b7a74] bg-[#effaf5]' : 'border-[#dce5e3] bg-white hover:bg-[#f6faf8]'}`}>
                  <Icon size={16} className="mt-0.5 shrink-0 text-[#1b7a74]" />
                  <span>
                    <span className="block text-[12px] font-semibold text-[#18232a]">{title}</span>
                    <span className="block text-[11px] text-[#718584]">{sub}</span>
                  </span>
                </button>
              ))}
            </div>

            {mode === 'dkg' && (
              <div className="space-y-3">
                {calibrations.length === 0 ? (
                  <div className="text-[12px] text-[#9b3d2a]">No calibration is published yet.</div>
                ) : (
                  <>
                    <select value={calibrationRef} onChange={(e) => setCalibrationRef(e.target.value)} className="w-full rounded-lg border border-[#dce5e3] bg-white px-3 py-2 text-[12px]">
                      {calibrations.map((c) => (
                        <option key={c.id} value={c.ual ?? ''}>{c.cameraLabel} · focal {c.focalPx} px · {c.passes?.length ?? 1} pass{(c.passes?.length ?? 1) === 1 ? '' : 'es'}</option>
                      ))}
                    </select>
                    <div className="rounded-xl bg-[#fff6ec] px-4 py-2.5 text-[11px] text-[#8a5a2b]">
                      A calibration belongs to one camera in one position. Use it only for footage from that same camera, or every speed will be off by the same factor, and the gate cannot catch that.
                    </div>
                    {chosen && (
                      <div className="rounded-xl bg-[#f6faf8] px-4 py-3 text-[11px] text-[#5b706e]">
                        <div className="mono break-all text-[10px] text-[#257b6d]">{chosen.ual}</div>
                        <div className="mt-1">Learned from {chosen.passes?.map((p) => p.clip.replace(/^vs13-|\.mp4$/g, '')).join(', ') ?? chosen.derivedFromStudy}{chosen.spreadPercent != null ? `; passes agreed within ${chosen.spreadPercent}%` : ''}.</div>
                      </div>
                    )}
                    <label className="flex items-center justify-between gap-3 text-[12px] text-[#40585a]">
                      <span>Vehicle height used for head-on speed (m)</span>
                      <input type="number" step="0.01" min="1" max="4" value={height} onChange={(e) => setHeight(Number(e.target.value))} className="w-24 rounded-lg border border-[#dce5e3] px-2 py-1.5 text-right" />
                    </label>
                  </>
                )}
              </div>
            )}

            {mode === 'curb' && (
              <div className="space-y-3">
                {study.links.firstFrame ? (
                  <div className="relative overflow-hidden rounded-xl border border-[#dce5e3]">
                    <img ref={imageRef} src={study.links.firstFrame} alt="First frame" className="block w-full cursor-crosshair" onClick={placeMark} />
                    {marks.map((m, i) => (
                      <span
                        key={i}
                        className="pointer-events-none absolute grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-[#1b7a74] text-[10px] font-bold text-white shadow"
                        style={{ left: `${(m.x / (imageRef.current?.naturalWidth || 1)) * 100}%`, top: `${(m.y / (imageRef.current?.naturalHeight || 1)) * 100}%` }}
                      >
                        {i + 1}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-[12px] text-[#718584]">The first frame is not available for this video.</div>
                )}
                <label className="flex items-center justify-between gap-3 text-[12px] text-[#40585a]">
                  <span>Real distance between the two marks (m)</span>
                  <input type="number" step="0.1" min="1" value={markMetres} onChange={(e) => setMarkMetres(Number(e.target.value))} className="w-24 rounded-lg border border-[#dce5e3] px-2 py-1.5 text-right" />
                </label>
                <div className="text-[11px] text-[#718584]">{marks.length < 2 ? `Click point ${marks.length + 1} on the near edge of the road.` : 'Two marks set. Click again to start over.'}</div>
              </div>
            )}

            {mode === 'length' && (
              <label className="flex items-center justify-between gap-3 text-[12px] text-[#40585a]">
                <span>Typical car length (m)</span>
                <input type="number" step="0.1" min="2" max="8" value={carLength} onChange={(e) => setCarLength(Number(e.target.value))} className="w-24 rounded-lg border border-[#dce5e3] px-2 py-1.5 text-right" />
              </label>
            )}

            {mode === 'none' && (
              <div className="rounded-xl bg-[#fff6ec] px-4 py-3 text-[12px] text-[#8a5a2b]">Every vehicle will be refused with NO_CALIBRATION. That is the point: without a known distance there is no honest speed.</div>
            )}
          </div>

          <div className="panel rounded-2xl p-6 space-y-4">
            <h3 className="text-[15px] font-semibold text-[#18232a]">About this street</h3>
            <label className="block text-[12px] text-[#40585a]">
              Street name
              <input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="e.g. Champlain Cres, Peterborough" className="mt-1 w-full rounded-lg border border-[#dce5e3] px-3 py-2" />
            </label>
            <label className="flex items-center justify-between gap-3 text-[12px] text-[#40585a]">
              <span>Posted limit (km/h)</span>
              <input type="number" min="10" max="130" value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="w-24 rounded-lg border border-[#dce5e3] px-2 py-1.5 text-right" />
            </label>
            <label className="flex items-center justify-between gap-3 text-[12px] text-[#40585a]">
              <span>Known speed, if testing (km/h)</span>
              <input value={known} onChange={(e) => setKnown(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="optional" className="w-24 rounded-lg border border-[#dce5e3] px-2 py-1.5 text-right" />
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-[#dce5e3] bg-white px-3 py-2.5 text-[12px] text-[#40585a]">
              <input type="checkbox" checked={conditions} onChange={(e) => setConditions(e.target.checked)} className="mt-0.5" />
              <span>
                <b className="text-[#18232a]">Ask Livepeer's vision model to check the footage.</b> nemotron-omni-vision looks at one frame for darkness, rain, glare or a blocked view. It can only refuse, never add a speed.
              </span>
            </label>
            <div className="mono break-all rounded-lg bg-[#f6faf8] px-3 py-2 text-[10px] text-[#5b706e]">video sha256 {short(study.videoSha256, 16, 10)}</div>
          </div>
        </div>
      )}

      {step === 2 && study && (
        <div className="panel max-w-[780px] rounded-2xl p-6 md:p-8 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-[16px] font-semibold text-[#18232a]">The refusal gate</h3>
              <p className="mt-1 text-[12px] text-[#637776]">Every vehicle must pass all of these, or it is refused with the reason. Refused vehicles never enter the 85th percentile.</p>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#dff3eb] text-[#277b6c] shadow-sm"><ShieldCheck size={22} /></span>
          </div>
          <div className="divide-y divide-[#e9efed]">
            {GATES.map((g) => (
              <div key={g.code} className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-[#def3e9] text-[#237c6b]"><Check size={13} /></span>
                  <div>
                    <div className="text-[12px] font-semibold text-[#18232a]">{g.title}</div>
                    <div className="text-[11px] text-[#728685]">{g.rule}</div>
                  </div>
                </div>
                <span className="mono text-[10px] text-[#8a9a99]">{g.code}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between pt-2">
        {step > 0 ? (
          <button onClick={() => setStep(step - 1)} className="btn btn-light" disabled={busy !== null}>
            <ArrowLeft size={14} /> Back
          </button>
        ) : <div />}
        {step === 1 && (
          <button onClick={() => setStep(2)} disabled={!canRun || (mode === 'dkg' && !calibrationRef)} className="btn btn-dark disabled:opacity-50">
            Review the gate
          </button>
        )}
        {step === 2 && (
          <button onClick={run} disabled={busy !== null} className="btn btn-dark shadow-md">
            {busy === 'run' ? <Loader2 size={14} className="animate-spin" /> : <Play size={13} fill="currentColor" />}
            <span>Run the study on Livepeer</span>
          </button>
        )}
      </div>
    </div>
  )
}
