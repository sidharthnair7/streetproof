import { Screen } from '../types/study'
import { TelemetryPlayer } from '../components/player/TelemetryPlayer'
import { GateLedger } from '../components/ledger/GateLedger'
import { TiltCard } from '../components/common/TiltCard'
import { BentoCard } from '../components/common/BentoCard'
import { AnimatedCounter } from '../components/common/AnimatedCounter'
import { Check, ShieldCheck, Database, FileCheck2, ArrowRight, KeyRound, ExternalLink } from 'lucide-react'

interface ResultsScreenProps {
  setScreen: (s: Screen) => void
}

export function ResultsScreen({ setScreen }: ResultsScreenProps) {
  return (
    <div className="space-y-8">
      {/* Title & Actions Bar */}
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="eyebrow mb-2">SP-2409-021 / Verified Speed Study</div>
          <h2 className="display text-4xl leading-tight md:text-5xl text-[#18232a]">
            Cedar Avenue
            <br />
            <em className="text-[#126b6a]">Speed Study.</em>
          </h2>
          <div className="mt-3 flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d9f3e9] px-2.5 py-1 text-[10px] font-semibold text-[#287463]">
              <Check size={11} /> Verified
            </span>
            <span className="text-[12px] text-[#6d807e]">
              24 Sep 2026 · 18 second clip · 30.00 fps locked
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button className="btn btn-light shadow-sm">
            <FileCheck2 size={15} /> Export City Council Report
          </button>
          <button onClick={() => setScreen('verifier')} className="btn btn-dark shadow-md">
            <ShieldCheck size={15} /> Open Public Verifier
          </button>
        </div>
      </div>

      {/* Top 4 Metrics Row */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <BentoCard glowColor="rgba(59, 185, 163, 0.3)">
          <div className="eyebrow mb-1">Vehicles Observed</div>
          <div className="stat-number text-3xl font-medium text-[#18232a]">
            <AnimatedCounter value={48} />
          </div>
          <div className="mt-1 text-[11px] text-[#718584]">All detected trajectories in clip</div>
        </BentoCard>

        <BentoCard glowColor="rgba(53, 102, 174, 0.3)">
          <div className="eyebrow mb-1 text-[#2d5c94]">Proven Speeds</div>
          <div className="stat-number text-3xl font-medium text-[#2d5c94]">
            <AnimatedCounter value={32} />
          </div>
          <div className="mt-1 text-[11px] text-[#718584]">66.7% passed all 6 gates</div>
        </BentoCard>

        <BentoCard glowColor="rgba(236, 138, 69, 0.3)">
          <div className="eyebrow mb-1 text-[#bd6a2c]">85th Percentile Speed</div>
          <div className="stat-number text-3xl font-medium text-[#bd6a2c]">
            <AnimatedCounter value={42.8} decimals={1} suffix=" km/h" />
          </div>
          <div className="mt-1 text-[11px] text-[#718584]">Primary civic traffic metric</div>
        </BentoCard>

        <BentoCard glowColor="rgba(236, 80, 80, 0.25)">
          <div className="eyebrow mb-1 text-[#c45334]">Over 30 km/h Limit</div>
          <div className="stat-number text-3xl font-medium text-[#c45334]">
            <AnimatedCounter value={34} suffix="%" />
          </div>
          <div className="mt-1 text-[11px] text-[#718584]">11 of 32 proven vehicles</div>
        </BentoCard>
      </section>

      {/* Video Scrubber & Gate Ledger Two-Column Layout */}
      <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <TelemetryPlayer />
        <GateLedger />
      </div>

      {/* Aceternity-style 3D Tilt Card: OriginTrail DKG Knowledge Asset */}
      <section>
        <TiltCard
          maxTilt={8}
          className="border-[#cce1dc] bg-gradient-to-br from-white/90 via-[#f7fbf9]/85 to-[#edf7f3]/90"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#e1f2ed] text-[#25776b] shadow-sm">
                <Database size={22} />
              </span>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="eyebrow text-[#25776b]">OriginTrail Decentralized Knowledge Graph</span>
                  <span className="rounded-full bg-[#3bb9a3]/15 px-2 py-0.5 mono text-[8px] font-bold text-[#1a6e60]">
                    IMMUTABLE PROVENANCE
                  </span>
                </div>
                <h3 className="text-[16px] font-semibold text-[#18232a]">
                  Published Knowledge Asset / Cryptographic Proof
                </h3>
                <p className="mt-1.5 max-w-[620px] text-[12px] leading-relaxed text-[#59716e]">
                  This study commits the SHA-256 video hash, 4-point homography calibration, timecode metadata, gate thresholds, proven speeds, and Livepeer capability ID to the DKG. Zero personal identifiable data (no faces, plates, or house numbers) are recorded.
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-3 mono text-[10px] text-[#4d6b67]">
                  <span className="flex items-center gap-1 rounded bg-white px-2 py-1 border border-[#d6e5e1]">
                    <KeyRound size={11} /> UAL: did:dkg:otp:2043/0x8d4d4e7...
                  </span>
                  <span className="flex items-center gap-1 rounded bg-white px-2 py-1 border border-[#d6e5e1]">
                    SHA-256: 8d4d4e7c9ac44c1d2e8b17f21c
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setScreen('verifier')}
              className="btn btn-dark shrink-0 shadow-lg"
            >
              <span>Launch UAL Public Verifier</span>
              <ExternalLink size={14} />
            </button>
          </div>
        </TiltCard>
      </section>
    </div>
  )
}
