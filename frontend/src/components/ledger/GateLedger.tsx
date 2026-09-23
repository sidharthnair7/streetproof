import { useState } from 'react'
import { ShieldCheck, AlertTriangle, Check, X, SlidersHorizontal, Info } from 'lucide-react'
import { GateRule } from '../../types/study'

interface GateLedgerProps {
  onInspectTrack?: (id: string) => void
}

const sampleGates: GateRule[] = [
  {
    id: 'gate-01',
    title: 'Calibrated Road Plane',
    subtitle: '4-point homography & 8.0m ground metric reference',
    threshold: 'Error < 2.5%',
    status: 'passed',
    testedCount: 48,
    passedCount: 48,
  },
  {
    id: 'gate-02',
    title: 'Locked Timecode',
    subtitle: 'Strict constant 30.00 fps from H.264 stream headers',
    threshold: 'Jitter < 0.2 fps',
    status: 'passed',
    testedCount: 48,
    passedCount: 48,
  },
  {
    id: 'gate-03',
    title: 'Minimum Trajectory Length',
    subtitle: 'Track must persist continuous detections for >= 12 frames',
    threshold: '>= 12 frames & >= 8m',
    status: 'refused',
    testedCount: 48,
    passedCount: 40, // 8 failed
  },
  {
    id: 'gate-04',
    title: 'Calibrated Zone Boundary',
    subtitle: 'Vehicle center of mass must remain fully inside homography polygon',
    threshold: 'Zero extrapolation',
    status: 'refused',
    testedCount: 40,
    passedCount: 35, // 5 failed
  },
  {
    id: 'gate-05',
    title: 'Speed Window Consistency',
    subtitle: 'Inter-frame sliding window variance must remain below 15%',
    threshold: 'Variance < 15%',
    status: 'refused',
    testedCount: 35,
    passedCount: 32, // 3 failed
  },
  {
    id: 'gate-06',
    title: 'Physical Plausibility Bounds',
    subtitle: 'Speed magnitude must fall within 3 km/h to 200 km/h limits',
    threshold: '3 - 200 km/h',
    status: 'passed',
    testedCount: 32,
    passedCount: 32,
  },
]

export function GateLedger({}: GateLedgerProps) {
  const [filter, setFilter] = useState<'all' | 'proven' | 'refused'>('all')
  const [selectedGate, setSelectedGate] = useState<GateRule | null>(null)

  return (
    <div className="panel rounded-2xl p-5 md:p-6 space-y-6">
      {/* Header & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5ebea] pb-4">
        <div>
          <div className="eyebrow mb-1">Deterministic Gate Ledger</div>
          <h3 className="text-[15px] font-semibold text-[#18232a]">Proof Gate Inspection</h3>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 rounded-xl bg-[#edf4f1] p-1 text-[11px] font-semibold">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              filter === 'all' ? 'bg-white text-[#18232a] shadow-sm' : 'text-[#617473] hover:text-[#18232a]'
            }`}
          >
            All Gates (6)
          </button>
          <button
            onClick={() => setFilter('proven')}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              filter === 'proven' ? 'bg-white text-[#187569] shadow-sm' : 'text-[#617473] hover:text-[#18232a]'
            }`}
          >
            Clean (3)
          </button>
          <button
            onClick={() => setFilter('refused')}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              filter === 'refused' ? 'bg-white text-[#bd6929] shadow-sm' : 'text-[#617473] hover:text-[#18232a]'
            }`}
          >
            Filtered Out (3)
          </button>
        </div>
      </div>

      {/* Summary Stat Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-[#f5faf8] p-3 border border-[#e1edea]">
          <div className="eyebrow text-[#358778] mb-1">Proven Speeds</div>
          <div className="stat-number text-2xl font-bold text-[#187569]">32</div>
          <div className="text-[10px] text-[#718583]">66.7% cleared all 6 gates</div>
        </div>
        <div className="rounded-xl bg-[#fff6ee] p-3 border border-[#fae2ce]">
          <div className="eyebrow text-[#b8692c] mb-1">Refused Speeds</div>
          <div className="stat-number text-2xl font-bold text-[#b8692c]">16</div>
          <div className="text-[10px] text-[#8f7560]">Discarded / no false claims</div>
        </div>
        <div className="rounded-xl bg-[#f0f4f7] p-3 border border-[#d8e3eb]">
          <div className="eyebrow text-[#3b669e] mb-1">Gate Rigor</div>
          <div className="stat-number text-2xl font-bold text-[#2d5c94]">100%</div>
          <div className="text-[10px] text-[#6d7e8e]">Deterministic math, zero AI guess</div>
        </div>
      </div>

      {/* Gate Rules List */}
      <div className="divide-y divide-[#edf3f1]">
        {sampleGates
          .filter((g) => {
            if (filter === 'proven') return g.passedCount === g.testedCount
            if (filter === 'refused') return g.passedCount < g.testedCount
            return true
          })
          .map((gate) => {
            const hasRefusals = gate.passedCount < gate.testedCount
            const refusedCount = gate.testedCount - gate.passedCount

            return (
              <div
                key={gate.id}
                onClick={() => setSelectedGate(gate)}
                className="py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#f9fcfa] rounded-xl px-2 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                      hasRefusals ? 'bg-[#fff0e2] text-[#be6b2b]' : 'bg-[#def3eb] text-[#227b6c]'
                    }`}
                  >
                    {hasRefusals ? <AlertTriangle size={15} /> : <Check size={16} />}
                  </span>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-semibold text-[#18232a]">{gate.title}</span>
                      <span className="mono text-[9px] text-[#718583]">[{gate.threshold}]</span>
                    </div>
                    <div className="text-[11px] text-[#6e807f]">{gate.subtitle}</div>
                  </div>
                </div>

                <div className="text-right">
                  {hasRefusals ? (
                    <span className="rounded-full bg-[#fae5d5] px-2.5 py-1 text-[10px] font-bold text-[#a65922]">
                      {refusedCount} Refused
                    </span>
                  ) : (
                    <span className="rounded-full bg-[#dcf3e9] px-2.5 py-1 text-[10px] font-bold text-[#1f7364]">
                      All {gate.passedCount} Passed
                    </span>
                  )}
                </div>
              </div>
            )
          })}
      </div>

      {/* Selected Gate Modal/Detail Card */}
      {selectedGate && (
        <div className="rounded-2xl border border-[#cfe2dd] bg-[#f0f8f5] p-4 text-[#1a3a37] space-y-2">
          <div className="flex items-center justify-between">
            <span className="mono text-[10px] font-bold uppercase tracking-wider text-[#24796b]">
              Why {selectedGate.title} Discarded Data
            </span>
            <button
              onClick={() => setSelectedGate(null)}
              className="text-[#517671] hover:text-black text-[11px] font-bold"
            >
              Close
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-[#40625d]">
            In legal and civic speed studies, optical noise and camera perspective compression can inflate or deflate speeds when tracking duration is brief. StreetProof's rule threshold ({selectedGate.threshold}) protects against community skepticism by automatically dropping any vehicle track that cannot guarantee mathematical convergence.
          </p>
        </div>
      )}
    </div>
  )
}
