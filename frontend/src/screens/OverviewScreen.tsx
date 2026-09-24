import { useEffect, useMemo, useState } from 'react'
import { Plus, ArrowRight, ShieldCheck, Users, Gauge, Database, Check, ChevronRight, Layers3, Loader2 } from 'lucide-react'
import { Screen } from '../types/study'
import { BentoCard } from '../components/common/BentoCard'
import { AnimatedCounter } from '../components/common/AnimatedCounter'
import { api, clipName, short } from '../api'
import type { StudyView, ValidationReport } from '../api'

interface OverviewScreenProps {
  setScreen: (s: Screen) => void
  openStudy: (id: string) => void
}

export function studyTitle(s: StudyView) {
  return s.streetLabel && s.streetLabel.trim() ? s.streetLabel : clipName(s.sourceName)
}

export function statusBadge(s: StudyView) {
  if (s.status === 'DONE' && s.published) return { text: 'Published', cls: 'bg-[#d9f3e9] text-[#287463]' }
  if (s.status === 'DONE') return { text: 'Measured', cls: 'bg-[#e7eef9] text-[#3e67a6]' }
  if (s.status === 'FAILED') return { text: 'Failed', cls: 'bg-[#fbe4df] text-[#b1462f]' }
  if (s.status === 'UPLOADED') return { text: 'Not run', cls: 'bg-[#edf0ef] text-[#6c7778]' }
  return { text: 'Running', cls: 'bg-[#fff0df] text-[#ce7b35]' }
}

export function OverviewScreen({ setScreen, openStudy }: OverviewScreenProps) {
  const [studies, setStudies] = useState<StudyView[] | null>(null)
  const [validation, setValidation] = useState<ValidationReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.studies().then(setStudies).catch((e: Error) => setError(e.message))
    api.validation().then(setValidation).catch(() => undefined)
  }, [])

  const done = useMemo(() => (studies ?? []).filter((s) => s.status === 'DONE' && s.summary), [studies])
  const totals = useMemo(() => {
    const observed = done.reduce((n, s) => n + (s.summary?.vehiclesObserved ?? 0), 0)
    const proven = done.reduce((n, s) => n + (s.summary?.vehiclesProven ?? 0), 0)
    const published = done.filter((s) => s.published).length
    return { observed, proven, published }
  }, [done])

  const featured = useMemo(
    () => done.find((s) => s.published && (s.summary?.vehiclesProven ?? 0) > 0) ?? done.find((s) => (s.summary?.vehiclesProven ?? 0) > 0) ?? null,
    [done],
  )

  return (
    <div className="space-y-8">
      <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <div className="relative overflow-hidden rounded-2xl bg-[#173337] p-6 text-white md:p-8 shadow-xl">
          <div className="absolute right-[-25px] top-[-50px] h-72 w-72 rounded-full border-[28px] border-[#2a706a]/30 pointer-events-none" />
          <div className="absolute right-[60px] top-[-5px] h-40 w-40 rounded-full border border-[#7fd7c2]/20 pointer-events-none" />
          <div className="relative z-10 max-w-[520px]">
            <div className="eyebrow mb-6 flex items-center gap-2 text-[#89bcb4]">
              <span className="live-dot h-2 w-2 rounded-full bg-[#9ce3d2]" />
              Resident Evidence Desk · Verifiable Speed Studies
            </div>
            <h2 className="display text-4xl leading-[.98] tracking-[-.06em] md:text-5xl">
              Turn “it feels fast”
              <br />
              <em className="text-[#9ce3d2] underline decoration-[#3bb9a3] decoration-2 underline-offset-8">into something provable.</em>
            </h2>
            <p className="mt-5 max-w-[440px] text-[13px] leading-6 text-[#b5c9c7]">
              StreetProof measures vehicle speeds from your own street footage, refuses any number the evidence cannot support, and publishes the result to the OriginTrail DKG so anyone can check it.
            </p>
            <div className="mt-8 flex flex-wrap gap-2.5">
              <button onClick={() => setScreen('new-study')} className="btn bg-[#a5e5d4] text-[#163d3e] font-semibold hover:bg-white shadow-lg">
                <Plus size={15} /> Start a new study <ArrowRight size={15} />
              </button>
              <button onClick={() => setScreen('field')} className="btn border border-white/20 text-white hover:bg-white/10">
                <Layers3 size={15} /> See every detection in 3D
              </button>
            </div>
          </div>
          <div className="relative z-10 mt-10 flex flex-wrap gap-2">
            {['Livepeer yolo-detect', 'Deterministic refusal gate', 'OriginTrail DKG'].map((t) => (
              <span key={t} className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 mono text-[9px] uppercase tracking-[.12em] text-[#b5d6d0]">{t}</span>
            ))}
          </div>
        </div>

        <BentoCard className="flex flex-col justify-between p-6">
          {featured ? (
            <>
              <div>
                <div className="mb-6 flex items-center justify-between gap-3">
                  <div>
                    <div className="eyebrow mb-1">Latest measured study</div>
                    <div className="text-[16px] font-bold text-[#18232a]">{studyTitle(featured)}</div>
                    <div className="mono text-[10px] text-[#869998]">{clipName(featured.sourceName)}</div>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusBadge(featured).cls}`}>
                    {featured.published && <Check size={11} />} {statusBadge(featured).text}
                  </span>
                </div>
                <div className="mb-6 flex items-end gap-3">
                  <span className="display text-6xl text-[#18232a] font-semibold">
                    <AnimatedCounter value={featured.summary?.v85Kmh ?? 0} decimals={1} />
                  </span>
                  <span className="mb-2 text-[12px] font-medium text-[#657675] leading-tight">km/h<br />85th percentile</span>
                </div>
                <div className="space-y-3 border-t border-[#e5ebea] pt-4 text-[12px]">
                  <div className="flex justify-between gap-3">
                    <span className="text-[#6d7e7d]">Over the {featured.postedLimitKmh} km/h limit</span>
                    <span className="font-bold text-[#c46c34]">
                      {Math.round((featured.summary?.shareOverLimit ?? 0) * 100)}% of {featured.summary?.vehiclesProven} proven
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#6d7e7d]">Knowledge Asset</span>
                    <span className="mono text-right text-[11px] font-semibold text-[#257b6d]">
                      {featured.published ? short(featured.published.ual, 16, 6) : 'not published yet'}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => openStudy(featured.id)} className="btn btn-light mt-6 w-full justify-between">
                <span>Open the study</span>
                <ChevronRight size={15} />
              </button>
            </>
          ) : (
            <div className="grid h-full min-h-[220px] place-items-center text-center text-[12px] text-[#6d7e7d]">
              {studies === null && !error ? <Loader2 className="animate-spin" size={18} /> : 'No measured study yet. Run a sample clip to see one here.'}
            </div>
          )}
        </BentoCard>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <div className="eyebrow mb-1">This workspace</div>
            <h2 className="text-[17px] font-bold text-[#18232a]">Workspace pulse</h2>
          </div>
          <span className="text-[11px] text-[#718584]">Live from the StreetProof server</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <BentoCard glowColor="rgba(59, 185, 163, 0.3)">
            <div className="mb-4 flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e1f2ed] text-[#217b6d]"><Users size={18} /></span>
              <span className="mono text-[9px] text-[#768b89]">{done.length} STUDIES</span>
            </div>
            <div className="eyebrow mb-1">Vehicles observed</div>
            <div className="stat-number text-3xl font-medium text-[#18232a]"><AnimatedCounter value={totals.observed} /></div>
            <div className="mt-1 text-[11px] text-[#788a89]">Tracked from Livepeer detections</div>
          </BentoCard>
          <BentoCard glowColor="rgba(53, 102, 174, 0.3)">
            <div className="mb-4 flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e7eef9] text-[#3e67a6]"><ShieldCheck size={18} /></span>
              <span className="mono text-[9px] text-[#768b89]">{totals.observed ? Math.round((totals.proven / totals.observed) * 100) : 0}% PROVEN</span>
            </div>
            <div className="eyebrow mb-1">Speeds proven</div>
            <div className="stat-number text-3xl font-medium text-[#3e67a6]"><AnimatedCounter value={totals.proven} /></div>
            <div className="mt-1 text-[11px] text-[#788a89]">The rest were refused, with a reason</div>
          </BentoCard>
          <BentoCard glowColor="rgba(236, 138, 69, 0.3)">
            <div className="mb-4 flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#fff0df] text-[#ce7b35]"><Gauge size={18} /></span>
              <span className="mono text-[9px] text-[#768b89]">HELD-OUT CLIPS</span>
            </div>
            <div className="eyebrow mb-1">Mean error</div>
            <div className="stat-number text-3xl font-medium text-[#ce7b35]">
              {validation?.meanAbsErrorPercent != null ? <AnimatedCounter value={validation.meanAbsErrorPercent} decimals={1} suffix="%" /> : '–'}
            </div>
            <div className="mt-1 text-[11px] text-[#788a89]">
              {validation?.meanAbsErrorPercent != null ? `${validation.proven} unseen clips, worst ${validation.maxAbsErrorPercent}%` : 'Run the accuracy test'}
            </div>
          </BentoCard>
          <BentoCard glowColor="rgba(156, 227, 210, 0.35)">
            <div className="mb-4 flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e1f2ed] text-[#217b6d]"><Database size={18} /></span>
              <span className="mono text-[9px] text-[#768b89]">DKG</span>
            </div>
            <div className="eyebrow mb-1">Studies published</div>
            <div className="stat-number text-3xl font-medium text-[#18232a]"><AnimatedCounter value={totals.published} /></div>
            <div className="mt-1 text-[11px] text-[#788a89]">As Knowledge Assets on OriginTrail</div>
          </BentoCard>
        </div>
      </section>

      <section className="panel overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-[#e5ebea] px-6 py-4">
          <div>
            <div className="eyebrow mb-1">Audit ledger</div>
            <h3 className="text-[15px] font-semibold text-[#18232a]">Speed studies</h3>
          </div>
          <button onClick={() => setScreen('accuracy')} className="text-[12px] font-semibold text-[#236d6b] hover:text-[#134947] flex items-center gap-1">
            <span>How accurate is it?</span>
            <ArrowRight size={14} />
          </button>
        </div>
        {error && <div className="px-6 py-5 text-[12px] text-[#b1462f]">Could not reach the StreetProof server: {error}</div>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[12px]">
            <thead className="bg-[#f8faf9] text-[#7e8f8e]">
              <tr>
                <th className="px-6 py-3.5 font-medium">Study</th>
                <th className="px-4 py-3.5 font-medium">Measured</th>
                <th className="px-4 py-3.5 font-medium">Observed</th>
                <th className="px-4 py-3.5 font-medium">Proven</th>
                <th className="px-4 py-3.5 font-medium">85th percentile</th>
                <th className="px-4 py-3.5 font-medium">Calibration</th>
                <th className="px-4 py-3.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1f0]">
              {(studies ?? []).map((s) => {
                const badge = statusBadge(s)
                return (
                  <tr key={s.id} onClick={() => openStudy(s.id)} className="cursor-pointer transition-colors hover:bg-[#f6faf8]">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-[#18232a]">{studyTitle(s)}</div>
                      <div className="mono text-[10px] text-[#869998]">{clipName(s.sourceName)} · {s.id}</div>
                    </td>
                    <td className="px-4 py-4 text-[#667a78]">{new Date(s.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-4 py-4 text-[#18232a]">{s.summary?.vehiclesObserved ?? '–'}</td>
                    <td className="px-4 py-4 font-semibold text-[#1f7364]">{s.summary?.vehiclesProven ?? '–'}</td>
                    <td className="px-4 py-4 font-semibold text-[#18232a]">{s.summary?.v85Kmh != null ? `${s.summary.v85Kmh.toFixed(1)} km/h` : '–'}</td>
                    <td className="px-4 py-4 text-[#667a78]">{s.calibrationUal ? 'from the DKG' : s.calibration ? s.calibration.mode.toLowerCase().replace('_', ' ') : 'none'}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${badge.cls}`}>
                        {s.published && <Check size={11} />}
                        {badge.text}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {studies && studies.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-6 text-center text-[#6d7e7d]">No studies yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
