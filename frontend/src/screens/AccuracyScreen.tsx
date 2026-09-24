import { useEffect, useState } from 'react'
import { Check, Database, Loader2, Target, X } from 'lucide-react'
import { BentoCard } from '../components/common/BentoCard'
import { AnimatedCounter } from '../components/common/AnimatedCounter'
import { api, clipName, short } from '../api'
import type { CalibrationRecord, ValidationReport } from '../api'

export function AccuracyScreen({ openStudy }: { openStudy: (id: string) => void }) {
  const [report, setReport] = useState<ValidationReport | null>(null)
  const [calibrations, setCalibrations] = useState<CalibrationRecord[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.validation().then(setReport).catch((e: Error) => setError(e.message))
    api.calibrations().then((c) => setCalibrations(c.filter((x) => x.ual))).catch(() => undefined)
  }, [])

  if (!report) {
    return <div className="grid min-h-[300px] place-items-center text-[#627574]">{error ?? <Loader2 className="animate-spin" />}</div>
  }

  const tests = report.rows.filter((r) => r.role === 'test')
  const passes = report.rows.filter((r) => r.role === 'calibration')
  const maxError = Math.max(10, ...tests.map((r) => Math.abs(r.errorPercent ?? 0)))
  const cross = report.crossValidation
  const current = calibrations.find((c) => c.ual === report.calibrationUal)

  return (
    <div className="space-y-8">
      <div>
        <div className="eyebrow mb-2">Accuracy / tested against known speeds</div>
        <h2 className="display text-4xl leading-tight md:text-5xl text-[#18232a]">
          Does it measure
          <br />
          <em className="text-[#126b6a]">the right speed?</em>
        </h2>
        <p className="mt-3 max-w-[680px] text-[13px] leading-6 text-[#617473]">
          VS13 is a public benchmark from the University of Montenegro: cars filmed head-on, each held at a known speed by cruise control. StreetProof learns one calibration from a few passes, publishes it to the DKG, then measures clips it has never seen.
        </p>
      </div>

      {report.clips === 0 ? (
        <div className="panel rounded-2xl p-6 text-[13px] text-[#627574]">
          No accuracy runs on this server yet. Put the VS13 sample clips in <span className="mono">samples/</span> and run <span className="mono">python scripts/reproduce_validation.py</span>.
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <BentoCard glowColor="rgba(59, 185, 163, 0.3)">
              <div className="eyebrow mb-1">Unseen clips proven</div>
              <div className="stat-number text-3xl font-medium text-[#18232a]">{report.proven} / {report.clips}</div>
              <div className="mt-1 text-[11px] text-[#718584]">{report.refused} refused</div>
            </BentoCard>
            <BentoCard glowColor="rgba(236, 138, 69, 0.3)">
              <div className="eyebrow mb-1 text-[#bd6a2c]">Mean error</div>
              <div className="stat-number text-3xl font-medium text-[#bd6a2c]">{report.meanAbsErrorPercent != null ? <AnimatedCounter value={report.meanAbsErrorPercent} decimals={1} suffix="%" /> : '–'}</div>
              <div className="mt-1 text-[11px] text-[#718584]">Absolute, across the unseen clips</div>
            </BentoCard>
            <BentoCard glowColor="rgba(236, 80, 80, 0.25)">
              <div className="eyebrow mb-1 text-[#c45334]">Worst clip</div>
              <div className="stat-number text-3xl font-medium text-[#c45334]">{report.maxAbsErrorPercent != null ? `${report.maxAbsErrorPercent}%` : '–'}</div>
              <div className="mt-1 text-[11px] text-[#718584]">Telraam states about 10% for its sensor</div>
            </BentoCard>
            <BentoCard glowColor="rgba(53, 102, 174, 0.3)">
              <div className="eyebrow mb-1 text-[#2d5c94]">Calibration passes</div>
              <div className="stat-number text-3xl font-medium text-[#2d5c94]">{report.calibrationClips.length}</div>
              <div className="mt-1 text-[11px] text-[#718584]">{current?.spreadPercent != null ? `Agreed within ${current.spreadPercent}%` : 'Loaded from the DKG'}</div>
            </BentoCard>
          </section>

          <section className="panel overflow-hidden rounded-2xl">
            <div className="border-b border-[#e5ebea] px-6 py-4">
              <div className="eyebrow mb-1">Held-out test</div>
              <h3 className="text-[15px] font-semibold text-[#18232a]">{report.summary}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[12px]">
                <thead className="bg-[#f8faf9] text-[#7e8f8e]">
                  <tr>
                    <th className="px-6 py-3 font-medium">Clip</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Known</th>
                    <th className="px-4 py-3 font-medium">Measured</th>
                    <th className="px-4 py-3 font-medium w-[34%]">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf1f0]">
                  {[...tests, ...passes].map((r) => (
                    <tr key={r.studyId} onClick={() => openStudy(r.studyId)} className="cursor-pointer hover:bg-[#f6faf8]">
                      <td className="px-6 py-3 font-semibold text-[#18232a]">{clipName(r.clip)}</td>
                      <td className="px-4 py-3">
                        {r.role === 'test' ? (
                          <span className="rounded-full bg-[#e7eef9] px-2 py-0.5 text-[10px] font-semibold text-[#3e67a6]">unseen</span>
                        ) : (
                          <span className="rounded-full bg-[#edf0ef] px-2 py-0.5 text-[10px] font-semibold text-[#6c7778]">calibration pass</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#667a78]">{r.knownKmh} km/h</td>
                      <td className="px-4 py-3 font-semibold text-[#18232a]">
                        {r.proven ? `${r.measuredKmh?.toFixed(1)} km/h` : <span className="inline-flex items-center gap-1 text-[#b1462f]"><X size={11} /> refused</span>}
                      </td>
                      <td className="px-4 py-3">
                        {r.errorPercent != null && (
                          <div className="flex items-center gap-3">
                            <div className="relative h-2 flex-1 rounded-full bg-[#eef3f2]">
                              <div className="absolute top-0 h-2 w-px bg-[#9cb0ae]" style={{ left: '50%' }} />
                              <div
                                className={`absolute top-0 h-2 rounded-full ${Math.abs(r.errorPercent) <= 5 ? 'bg-[#3bb9a3]' : Math.abs(r.errorPercent) <= 10 ? 'bg-[#e0a24a]' : 'bg-[#d65a4f]'}`}
                                style={{ left: r.errorPercent >= 0 ? '50%' : `${50 - (Math.abs(r.errorPercent) / maxError) * 50}%`, width: `${(Math.abs(r.errorPercent) / maxError) * 50}%` }}
                              />
                            </div>
                            <span className="mono w-14 text-right text-[11px] text-[#40585a]">{r.errorPercent > 0 ? '+' : ''}{r.errorPercent}%</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-[#e5ebea] px-6 py-3 text-[11px] text-[#718584]">
              Calibration passes are shown for completeness. They are not held out, so they are left out of the mean.
            </div>
          </section>

          {cross && (
            <section className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
              <div className="panel rounded-2xl p-6">
                <div className="eyebrow mb-1">Every possible choice of calibration clips</div>
                <h3 className="text-[15px] font-semibold text-[#18232a]">More passes protect you from one bad pass</h3>
                <div className="mt-5 space-y-4">
                  {cross.levels.map((l) => (
                    <div key={l.passes}>
                      <div className="mb-1 flex items-baseline justify-between text-[12px]">
                        <span className="font-semibold text-[#18232a]">{l.passes} pass{l.passes === 1 ? '' : 'es'} <span className="font-normal text-[#869998]">({l.combinations} choices)</span></span>
                        <span className="mono text-[#40585a]">{l.meanAbsErrorPercent}% avg · worst choice {l.worstCombinationMeanPercent}%</span>
                      </div>
                      <div className="relative h-2.5 rounded-full bg-[#eef3f2]">
                        <div className="absolute h-2.5 rounded-full bg-[#f3d3c6]" style={{ width: `${(l.worstCombinationMeanPercent / 14) * 100}%` }} />
                        <div className="absolute h-2.5 rounded-full bg-[#3bb9a3]" style={{ width: `${(l.meanAbsErrorPercent / 14) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-5 text-[11px] leading-relaxed text-[#718584]">{cross.method}</p>
              </div>
              <div className="panel rounded-2xl p-6">
                <div className="eyebrow mb-1">If you calibrated on one clip</div>
                <h3 className="text-[15px] font-semibold text-[#18232a]">One unlucky clip is why this exists</h3>
                <div className="mt-4 space-y-1.5">
                  {cross.singleClipChoices.map((c) => (
                    <div key={c.clip} className="flex items-center gap-3 text-[11.5px]">
                      <span className="w-40 shrink-0 truncate text-[#40585a]">{clipName(c.clip)}</span>
                      <div className="h-2 flex-1 rounded-full bg-[#eef3f2]">
                        <div className={`h-2 rounded-full ${c.meanAbsErrorPercent > 8 ? 'bg-[#d65a4f]' : 'bg-[#6fb7a5]'}`} style={{ width: `${(c.meanAbsErrorPercent / 14) * 100}%` }} />
                      </div>
                      <span className="mono w-12 text-right text-[#40585a]">{c.meanAbsErrorPercent}%</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[11px] leading-relaxed text-[#718584]">
                  Our first test calibrated on the Kia alone and every other clip read too fast. The Kia turned out to be the worst of the twelve clips to calibrate on. The median of several passes, with a 15% agreement rule, is the fix.
                </p>
              </div>
            </section>
          )}
        </>
      )}

      <section className="panel rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="eyebrow mb-1">Calibration memory</div>
            <h3 className="text-[15px] font-semibold text-[#18232a]">Calibrations published to the DKG</h3>
          </div>
          <Database size={18} className="text-[#1b7a74]" />
        </div>
        <div className="space-y-4">
          {calibrations.map((c) => (
            <div key={c.id} className="rounded-xl border border-[#e3eae8] bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[13px] font-semibold text-[#18232a]">{c.cameraLabel}</div>
                  <div className="mono mt-0.5 break-all text-[10px] text-[#257b6d]">{c.ual}</div>
                </div>
                <div className="text-right text-[11px] text-[#5b706e]">
                  <div className="mono text-[14px] font-semibold text-[#18232a]">{c.focalPx} px</div>
                  <div>focal length, {c.passes?.length ?? 1} pass{(c.passes?.length ?? 1) === 1 ? '' : 'es'}{c.spreadPercent != null ? `, spread ${c.spreadPercent}%` : ''}</div>
                </div>
              </div>
              {c.passes && c.passes.length > 0 && (
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {c.passes.map((p) => (
                    <div key={p.videoSha256} className="rounded-lg bg-[#f6faf8] px-3 py-2 text-[11px] text-[#5b706e]">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#18232a]">{clipName(p.clip)}</span>
                        <span className="mono">{p.deviationPercent > 0 ? '+' : ''}{p.deviationPercent}%</span>
                      </div>
                      <div className="mono mt-1 truncate text-[10px]" title={p.studyUal ?? ''}>{p.studyUal ? short(p.studyUal, 16, 10) : `sha ${short(p.videoSha256, 10, 6)}`}</div>
                    </div>
                  ))}
                </div>
              )}
              {c.ual === report.calibrationUal && (
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#d9f3e9] px-2.5 py-1 text-[10px] font-semibold text-[#287463]"><Check size={11} /> Used by the held-out test above</div>
              )}
            </div>
          ))}
          {calibrations.length === 0 && <div className="text-[12px] text-[#718584]"><Target size={13} className="mr-1 inline" /> No calibration published yet.</div>}
        </div>
      </section>
    </div>
  )
}
