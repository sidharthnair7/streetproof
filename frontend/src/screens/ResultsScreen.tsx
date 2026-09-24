import { useEffect, useMemo, useState } from 'react'
import { Check, Database, ExternalLink, FileCheck2, KeyRound, Layers3, Loader2, ShieldCheck, UploadCloud, X } from 'lucide-react'
import { BentoCard } from '../components/common/BentoCard'
import { AnimatedCounter } from '../components/common/AnimatedCounter'
import { TiltCard } from '../components/common/TiltCard'
import { api, clipName, short } from '../api'
import type { SpeedAnalysis, StudyView, VehicleView } from '../api'
import { GATES } from '../gates'
import { studyTitle } from './OverviewScreen'

interface ResultsScreenProps {
  studyId: string | null
  onVerify: (ual: string | null) => void
  onField: () => void
  onBack: () => void
}

export function ResultsScreen({ studyId, onVerify, onField, onBack }: ResultsScreenProps) {
  const [study, setStudy] = useState<StudyView | null>(null)
  const [vehicles, setVehicles] = useState<VehicleView[]>([])
  const [analysis, setAnalysis] = useState<SpeedAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    if (!studyId) return
    setError(null)
    api.study(studyId).then((s) => {
      setStudy(s)
      if (s.status === 'DONE') {
        api.vehicles(s.id).then(setVehicles).catch(() => undefined)
        api.analysis(s.id).then(setAnalysis).catch(() => undefined)
      }
    }).catch((e: Error) => setError(e.message))
  }, [studyId])

  const ledger = useMemo(() => {
    const refused = analysis?.refusalsByReason ?? {}
    let remaining = analysis?.summary.vehiclesObserved ?? 0
    return GATES.map((g) => {
      const tested = remaining
      const out = refused[g.code] ?? 0
      remaining -= out
      return { ...g, tested, refused: out, passed: tested - out }
    })
  }, [analysis])

  const publish = async () => {
    if (!study) return
    setPublishing(true)
    setError(null)
    try {
      await api.publish(study.id)
      setStudy(await api.study(study.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setPublishing(false)
    }
  }

  if (!studyId) {
    return (
      <div className="panel mx-auto max-w-[600px] rounded-2xl p-8 text-center text-[13px] text-[#627574]">
        Pick a study from the <button onClick={onBack} className="font-semibold text-[#126b6a]">workspace</button> to see its results.
      </div>
    )
  }
  if (!study) {
    return <div className="grid min-h-[300px] place-items-center text-[#627574]">{error ?? <Loader2 className="animate-spin" />}</div>
  }

  const s = study.summary
  const maxCount = Math.max(1, ...(analysis?.histogram.map((b) => b.count) ?? [1]))

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="eyebrow mb-2">{study.id} / speed study</div>
          <h2 className="display text-4xl leading-tight md:text-5xl text-[#18232a]">
            {studyTitle(study)}
            <br />
            <em className="text-[#126b6a]">Speed study.</em>
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {study.published ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d9f3e9] px-2.5 py-1 text-[10px] font-semibold text-[#287463]"><Check size={11} /> Published to the DKG</span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e7eef9] px-2.5 py-1 text-[10px] font-semibold text-[#3e67a6]">Measured, not published</span>
            )}
            <span className="text-[12px] text-[#6d807e]">
              {clipName(study.sourceName)} · {study.video ? `${study.video.durationSeconds.toFixed(1)} s clip · ${study.video.sourceFps.toFixed(2)} fps` : ''} · sampled at {study.sampleFps} fps · limit {study.postedLimitKmh} km/h
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <a href={api.reportUrl(study.id)} target="_blank" rel="noreferrer" className="btn btn-light shadow-sm">
            <FileCheck2 size={15} /> Report for the city
          </a>
          <button onClick={onField} className="btn btn-light shadow-sm"><Layers3 size={15} /> Every detection in 3D</button>
          <button onClick={() => onVerify(study.published?.ual ?? null)} className="btn btn-dark shadow-md"><ShieldCheck size={15} /> Verify a video</button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-[#f1c8bd] bg-[#fdf1ee] px-4 py-3 text-[12px] text-[#9b3d2a]">{error}</div>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <BentoCard glowColor="rgba(59, 185, 163, 0.3)">
          <div className="eyebrow mb-1">Vehicles observed</div>
          <div className="stat-number text-3xl font-medium text-[#18232a]"><AnimatedCounter value={s?.vehiclesObserved ?? 0} /></div>
          <div className="mt-1 text-[11px] text-[#718584]">Tracks built from Livepeer boxes</div>
        </BentoCard>
        <BentoCard glowColor="rgba(53, 102, 174, 0.3)">
          <div className="eyebrow mb-1 text-[#2d5c94]">Proven speeds</div>
          <div className="stat-number text-3xl font-medium text-[#2d5c94]"><AnimatedCounter value={s?.vehiclesProven ?? 0} /></div>
          <div className="mt-1 text-[11px] text-[#718584]">{s?.vehiclesRefused ?? 0} refused, each with a reason</div>
        </BentoCard>
        <BentoCard glowColor="rgba(236, 138, 69, 0.3)">
          <div className="eyebrow mb-1 text-[#bd6a2c]">85th percentile</div>
          <div className="stat-number text-3xl font-medium text-[#bd6a2c]">{s?.v85Kmh != null ? <AnimatedCounter value={s.v85Kmh} decimals={1} suffix=" km/h" /> : '–'}</div>
          <div className="mt-1 text-[11px] text-[#718584]">The number traffic engineers use</div>
        </BentoCard>
        <BentoCard glowColor="rgba(236, 80, 80, 0.25)">
          <div className="eyebrow mb-1 text-[#c45334]">Over {study.postedLimitKmh} km/h</div>
          <div className="stat-number text-3xl font-medium text-[#c45334]">{s?.shareOverLimit != null ? <AnimatedCounter value={Math.round(s.shareOverLimit * 100)} suffix="%" /> : '–'}</div>
          <div className="mt-1 text-[11px] text-[#718584]">Of the proven vehicles</div>
        </BentoCard>
      </section>

      {analysis && s && s.vehiclesProven > 0 && (
        <section className="panel rounded-2xl px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-[520px]">
              <div className="eyebrow mb-1">Check before you ask the city</div>
              <div className="text-[13px] font-semibold text-[#18232a]">Toronto's traffic calming warrant, as an example</div>
              <p className="mt-1 text-[11.5px] leading-relaxed text-[#6d807e]">
                Speed humps are warranted when the 85th percentile is over 38 km/h or the 95th over 45 km/h on a local road (30 km/h warrant speed, block of 120 m or more). A request found not warranted locks the street out of new data collection for three years.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                ['85th percentile', s.v85Kmh, 38],
                ['95th percentile', analysis.p95Kmh, 45],
              ].map(([label, value, bar]) => (
                <div key={label as string} className={`rounded-xl border px-4 py-3 ${value != null && (value as number) > (bar as number) ? 'border-[#f1c8bd] bg-[#fdf1ee]' : 'border-[#dce5e3] bg-white'}`}>
                  <div className="eyebrow mb-1">{label as string}</div>
                  <div className="stat-number text-xl text-[#18232a]">{value != null ? `${(value as number).toFixed(1)}` : '–'}</div>
                  <div className="text-[10.5px] text-[#6d807e]">{value != null && (value as number) > (bar as number) ? `over ${bar}: meets it` : `needs over ${bar}`}</div>
                </div>
              ))}
              <div className={`rounded-xl border px-4 py-3 ${s.vehiclesProven >= 50 ? 'border-[#cfe6df] bg-[#effaf5]' : 'border-[#e3d9c5] bg-[#fbf6ec]'}`}>
                <div className="eyebrow mb-1">Sample</div>
                <div className="stat-number text-xl text-[#18232a]">{s.vehiclesProven}</div>
                <div className="text-[10.5px] text-[#6d807e]">{s.vehiclesProven >= 50 ? 'enough for a spot study' : 'studies use 50 or more'}</div>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <div className="panel overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-[#e5ebea] px-5 py-3.5">
            <div>
              <div className="eyebrow mb-1">Annotated evidence</div>
              <div className="text-[13px] font-semibold text-[#18232a]">Green is proven. Red is refused, with the reason.</div>
            </div>
          </div>
          {study.links.video ? (
            <video key={study.links.video} src={study.links.video} className="block w-full bg-black" controls autoPlay muted loop playsInline />
          ) : (
            <div className="grid aspect-video place-items-center bg-[#0f1c20] text-[12px] text-[#7f9c98]">The annotated video appears when the run is done.</div>
          )}
          {analysis && (
            <div className="border-t border-[#e5ebea] px-5 py-4 text-[12px] text-[#40585a]">{analysis.headline}</div>
          )}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-[#e5ebea] px-5 py-4 text-[11.5px] md:grid-cols-3">
            <div>
              <dt className="eyebrow mb-1">Livepeer</dt>
              <dd className="text-[#18232a]">{study.progress.framesTotal} frames through yolo-detect{study.usedCachedDetections ? ' (cached on re-run)' : ''}</dd>
            </div>
            <div>
              <dt className="eyebrow mb-1">Calibration</dt>
              <dd className="text-[#18232a]">
                {study.calibrationUal ? 'Loaded from the DKG' : study.calibration ? study.calibration.mode.toLowerCase().replace('_', ' ') : 'None, so every vehicle is refused'}
                {study.calibration?.focalPx ? ` · focal ${study.calibration.focalPx} px · height ${study.calibration.metres} m` : study.calibration?.metres ? ` · ${study.calibration.metres} m` : ''}
              </dd>
            </div>
            <div>
              <dt className="eyebrow mb-1">Video fingerprint</dt>
              <dd className="mono break-all text-[10.5px] text-[#18232a]" title={study.videoSha256}>{short(study.videoSha256, 14, 10)}</dd>
            </div>
            {study.conditionsNote && (
              <div className="col-span-2 md:col-span-3">
                <dt className="eyebrow mb-1">Conditions check</dt>
                <dd className="text-[#18232a]">{study.conditionsNote}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="panel rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="eyebrow mb-1">Gate ledger</div>
              <div className="text-[13px] font-semibold text-[#18232a]">Where each vehicle stopped</div>
            </div>
            <ShieldCheck size={18} className="text-[#1b7a74]" />
          </div>
          <div className="space-y-2">
            {ledger.map((g) => (
              <div key={g.code} className="rounded-xl border border-[#e3eae8] bg-white px-3.5 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[12px] font-semibold text-[#18232a]">{g.title}</div>
                  <div className="mono text-[10px]">
                    <span className="text-[#257968]">{g.passed} pass</span>
                    {g.refused > 0 && <span className="ml-2 text-[#c45334]">{g.refused} refused</span>}
                  </div>
                </div>
                <div className="mt-0.5 text-[10.5px] text-[#728685]">{g.rule}</div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#eef3f2]">
                  <div className="h-full bg-[#3bb9a3]" style={{ width: `${g.tested ? (g.passed / g.tested) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="panel overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-[#e5ebea] px-6 py-4">
          <div>
            <div className="eyebrow mb-1">Every vehicle</div>
            <h3 className="text-[15px] font-semibold text-[#18232a]">What was measured, and what was refused</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-[12px]">
            <thead className="bg-[#f8faf9] text-[#7e8f8e]">
              <tr>
                <th className="px-5 py-3 font-medium">Vehicle</th>
                <th className="px-4 py-3 font-medium">Verdict</th>
                <th className="px-4 py-3 font-medium">Speed</th>
                <th className="px-4 py-3 font-medium">Clean frames</th>
                <th className="px-4 py-3 font-medium">Fit R²</th>
                <th className="px-4 py-3 font-medium">Confidence</th>
                <th className="px-4 py-3 font-medium">Known speed</th>
                <th className="px-4 py-3 font-medium">Why refused</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1f0]">
              {vehicles.map((v) => (
                <tr key={v.trackId}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <img src={v.thumbnailUrl} alt="" className="h-10 w-14 rounded-md bg-[#eef3f2] object-cover" />
                      <div>
                        <div className="font-semibold text-[#18232a]">#{v.trackId} {v.label}</div>
                        <div className="text-[10px] text-[#869998]">{v.firstSeenSeconds.toFixed(1)}–{v.lastSeenSeconds.toFixed(1)} s</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {v.proven ? (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${v.overLimit ? 'bg-[#fff0df] text-[#ce7b35]' : 'bg-[#d9f3e9] text-[#287463]'}`}><Check size={10} /> {v.overLimit ? 'Over limit' : 'Proven'}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#fbe4df] px-2 py-0.5 text-[10px] font-semibold text-[#b1462f]"><X size={10} /> Refused</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-[#18232a]">{v.kmh != null ? `${v.kmh.toFixed(1)} km/h` : '–'}</td>
                  <td className="px-4 py-3 text-[#667a78]">{v.cleanFrames} / {v.totalFrames}</td>
                  <td className="px-4 py-3 mono text-[#667a78]">{Number.isFinite(v.rSquared) ? v.rSquared.toFixed(3) : '–'}</td>
                  <td className="px-4 py-3 mono text-[#667a78]">{v.medianConfidence.toFixed(2)}</td>
                  <td className="px-4 py-3 text-[#667a78]">{v.knownKmh != null ? `${v.knownKmh} km/h${v.errorPercent != null ? ` (${v.errorPercent > 0 ? '+' : ''}${v.errorPercent}%)` : ''}` : '–'}</td>
                  <td className="px-4 py-3 text-[#8a5a2b]">{v.proven ? '' : `${v.reasonMeaning ?? v.reason}${v.detail ? `: ${v.detail}` : ''}`}</td>
                </tr>
              ))}
              {vehicles.length === 0 && <tr><td colSpan={8} className="px-6 py-6 text-center text-[#6d7e7d]">No vehicles tracked.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {analysis && analysis.histogram.length > 0 && (
        <section className="panel rounded-2xl p-6">
          <div className="eyebrow mb-1">Proven speeds</div>
          <div className="mb-5 text-[13px] font-semibold text-[#18232a]">Vehicles per 5 km/h band</div>
          <div className="flex h-40 items-end justify-center gap-1.5">
            {analysis.histogram.map((b) => (
              <div key={b.fromKmh} className="flex max-w-[64px] flex-1 flex-col items-center gap-1">
                <div className="mono text-[10px] text-[#667a78]">{b.count || ''}</div>
                <div className={`w-full rounded-t-md ${b.fromKmh >= study.postedLimitKmh ? 'bg-[#e08a4c]' : 'bg-[#3bb9a3]'}`} style={{ height: `${(b.count / maxCount) * 110}px` }} />
                <div className="mono text-[10px] text-[#869998]">{b.fromKmh}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <TiltCard maxTilt={6} className="border-[#cce1dc] bg-gradient-to-br from-white/90 via-[#f7fbf9]/85 to-[#edf7f3]/90">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#e1f2ed] text-[#25776b] shadow-sm"><Database size={22} /></span>
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="eyebrow text-[#25776b]">OriginTrail Decentralized Knowledge Graph</span>
                  {study.published && <span className="rounded-full bg-[#3bb9a3]/15 px-2 py-0.5 mono text-[8px] font-bold text-[#1a6e60]">{study.published.network}</span>}
                </div>
                <h3 className="text-[16px] font-semibold text-[#18232a]">{study.published ? 'Published Knowledge Asset' : 'Publish this study'}</h3>
                <p className="mt-1.5 max-w-[640px] text-[12px] leading-relaxed text-[#59716e]">
                  The asset holds the video's SHA-256 fingerprint, the method and thresholds, every vehicle's result and refusal reason, the Livepeer capability used{study.calibrationUal ? ', and a link to the calibration asset it was measured with' : ''}. The video itself is not published.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 mono text-[10px] text-[#4d6b67]">
                  {study.published && (
                    <span className="flex items-center gap-1 rounded border border-[#d6e5e1] bg-white px-2 py-1" title={study.published.ual}><KeyRound size={11} /> {short(study.published.ual, 30, 12)}</span>
                  )}
                  <span className="rounded border border-[#d6e5e1] bg-white px-2 py-1" title={study.videoSha256}>video sha256 {short(study.videoSha256, 12, 8)}</span>
                  {study.calibrationUal && <span className="rounded border border-[#d6e5e1] bg-white px-2 py-1" title={study.calibrationUal}>calibration {short(study.calibrationUal, 22, 8)}</span>}
                </div>
              </div>
            </div>
            {study.published ? (
              <button onClick={() => onVerify(study.published!.ual)} className="btn btn-dark shrink-0 shadow-lg"><span>Check a video against it</span><ExternalLink size={14} /></button>
            ) : (
              <button onClick={publish} disabled={publishing || study.status !== 'DONE'} className="btn btn-dark shrink-0 shadow-lg">
                {publishing ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                <span>{publishing ? 'Writing to the DKG…' : 'Publish to the DKG'}</span>
              </button>
            )}
          </div>
        </TiltCard>
      </section>
    </div>
  )
}
