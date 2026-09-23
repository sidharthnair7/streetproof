import { Screen, Study } from '../types/study'
import { BentoCard } from '../components/common/BentoCard'
import { AnimatedCounter } from '../components/common/AnimatedCounter'
import { Plus, ArrowRight, ShieldCheck, Users, Gauge, Database, Check, ChevronRight } from 'lucide-react'

interface OverviewScreenProps {
  setScreen: (s: Screen) => void
  studies: Study[]
}

export function OverviewScreen({ setScreen, studies }: OverviewScreenProps) {
  return (
    <div className="space-y-8">
      {/* Top Hero & Latest Study Bento Row */}
      <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        {/* Left Hero Card */}
        <div className="relative overflow-hidden rounded-2xl bg-[#173337] p-6 text-white md:p-8 shadow-xl">
          {/* Subtle concentric rings */}
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
              <em className="text-[#9ce3d2] underline decoration-[#3bb9a3] decoration-2 underline-offset-8">
                into something provable.
              </em>
            </h2>
            <p className="mt-5 max-w-[440px] text-[13px] leading-6 text-[#b5c9c7]">
              StreetProof measures vehicle speeds from your own street footage, then refuses any number it cannot defend in front of a traffic committee or city council.
            </p>

            <button
              onClick={() => setScreen('new-study')}
              className="btn mt-8 bg-[#a5e5d4] text-[#163d3e] font-semibold hover:bg-white shadow-lg transition-transform hover:scale-105"
            >
              <Plus size={15} /> Start a new study <ArrowRight size={15} />
            </button>
          </div>

          <div className="relative z-10 mt-10 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 mono text-[9px] uppercase tracking-[.12em] text-[#b5d6d0]">
              Livepeer detection
            </span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 mono text-[9px] uppercase tracking-[.12em] text-[#b5d6d0]">
              Deterministic gates
            </span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 mono text-[9px] uppercase tracking-[.12em] text-[#b5d6d0]">
              OriginTrail DKG
            </span>
          </div>
        </div>

        {/* Right Featured Study Bento Card */}
        <BentoCard className="flex flex-col justify-between p-6">
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="eyebrow mb-1">Featured Evidence Audit</div>
                <div className="text-[16px] font-bold text-[#18232a]">Cedar Avenue</div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d9f3e9] px-2.5 py-1 text-[10px] font-semibold text-[#287463]">
                <Check size={11} /> Verified
              </span>
            </div>

            <div className="mb-6 flex items-end gap-3">
              <span className="display text-6xl text-[#18232a] font-semibold">
                <AnimatedCounter value={42.8} decimals={1} />
              </span>
              <span className="mb-2 text-[12px] font-medium text-[#657675] leading-tight">
                km/h
                <br />
                85th percentile
              </span>
            </div>

            <div className="space-y-3 border-t border-[#e5ebea] pt-4 text-[12px]">
              <div className="flex justify-between">
                <span className="text-[#6d7e7d]">Over 30 km/h limit</span>
                <span className="font-bold text-[#c46c34]">34% (11 of 32 vehicles)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6d7e7d]">Knowledge Asset</span>
                <span className="flex items-center gap-1 font-semibold text-[#257b6d]">
                  <Check size={13} /> Published on DKG
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setScreen('results')}
            className="btn btn-light mt-6 w-full justify-between"
          >
            <span>Inspect Full Audit & Telemetry</span>
            <ChevronRight size={15} />
          </button>
        </BentoCard>
      </section>

      {/* Bento Grid: Workspace Pulse with Cursor Proximity Glow */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <div className="eyebrow mb-1">Workspace Telemetry</div>
            <h2 className="text-[17px] font-bold text-[#18232a]">Workspace Pulse</h2>
          </div>
          <span className="text-[11px] text-[#718584]">Aggregated across all published studies</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <BentoCard glowColor="rgba(59, 185, 163, 0.3)">
            <div className="mb-4 flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e1f2ed] text-[#217b6d]">
                <Users size={18} />
              </span>
              <span className="mono text-[9px] text-[#768b89]">LIVE</span>
            </div>
            <div className="eyebrow mb-1">Vehicles Observed</div>
            <div className="stat-number text-3xl font-medium text-[#18232a]">
              <AnimatedCounter value={142} />
            </div>
            <div className="mt-1 text-[11px] text-[#788a89]">Total AI detections</div>
          </BentoCard>

          <BentoCard glowColor="rgba(53, 102, 174, 0.3)">
            <div className="mb-4 flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e7eef9] text-[#3e67a6]">
                <ShieldCheck size={18} />
              </span>
              <span className="mono text-[9px] text-[#768b89]">65.4% CLEAR</span>
            </div>
            <div className="eyebrow mb-1">Speeds Proven</div>
            <div className="stat-number text-3xl font-medium text-[#3e67a6]">
              <AnimatedCounter value={93} />
            </div>
            <div className="mt-1 text-[11px] text-[#788a89]">Cleared all 6 proof gates</div>
          </BentoCard>

          <BentoCard glowColor="rgba(236, 138, 69, 0.3)">
            <div className="mb-4 flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#fff0df] text-[#ce7b35]">
                <Gauge size={18} />
              </span>
              <span className="mono text-[9px] text-[#768b89]">PEAK</span>
            </div>
            <div className="eyebrow mb-1">Highest 85th Pct.</div>
            <div className="stat-number text-3xl font-medium text-[#ce7b35]">
              <AnimatedCounter value={47.2} decimals={1} suffix=" km/h" />
            </div>
            <div className="mt-1 text-[11px] text-[#788a89]">Marlow Crescent audit</div>
          </BentoCard>

          <BentoCard glowColor="rgba(156, 227, 210, 0.35)">
            <div className="mb-4 flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e1f2ed] text-[#217b6d]">
                <Database size={18} />
              </span>
              <span className="mono text-[9px] text-[#768b89]">IMMUTABLE</span>
            </div>
            <div className="eyebrow mb-1">Evidence Assets</div>
            <div className="stat-number text-3xl font-medium text-[#18232a]">
              <AnimatedCounter value={4} />
            </div>
            <div className="mt-1 text-[11px] text-[#788a89]">Published on OriginTrail DKG</div>
          </BentoCard>
        </div>
      </section>

      {/* Recent Studies Archive Table */}
      <section className="panel overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-[#e5ebea] px-6 py-4">
          <div>
            <div className="eyebrow mb-1">Audit Ledger</div>
            <h3 className="text-[15px] font-semibold text-[#18232a]">Recent Speed Studies</h3>
          </div>
          <button
            onClick={() => setScreen('results')}
            className="text-[12px] font-semibold text-[#236d6b] hover:text-[#134947] flex items-center gap-1"
          >
            <span>View all studies</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-[12px]">
            <thead className="bg-[#f8faf9] text-[#7e8f8e]">
              <tr>
                <th className="px-6 py-3.5 font-medium">Study / Street</th>
                <th className="px-4 py-3.5 font-medium">Date</th>
                <th className="px-4 py-3.5 font-medium">Observed</th>
                <th className="px-4 py-3.5 font-medium">Proven</th>
                <th className="px-4 py-3.5 font-medium">85th Percentile</th>
                <th className="px-4 py-3.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1f0]">
              {studies.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => s.status === 'Verified' && setScreen('results')}
                  className="cursor-pointer transition-colors hover:bg-[#f6faf8]"
                >
                  <td className="px-6 py-4">
                    <div className="font-semibold text-[#18232a]">{s.street}</div>
                    <div className="mono text-[10px] text-[#869998]">{s.id}</div>
                  </td>
                  <td className="px-4 py-4 text-[#667a78]">{s.date}</td>
                  <td className="px-4 py-4 text-[#18232a]">{s.vehicles}</td>
                  <td className="px-4 py-4 font-semibold text-[#1f7364]">{s.proven}</td>
                  <td className="px-4 py-4 font-semibold text-[#18232a]">{s.p85}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        s.status === 'Verified'
                          ? 'bg-[#d9f3e9] text-[#287463]'
                          : 'bg-[#edf0ef] text-[#6c7778]'
                      }`}
                    >
                      {s.status === 'Verified' && <Check size={11} />}
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
