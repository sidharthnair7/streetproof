import { useState } from 'react'
import { Screen } from '../types/study'
import { TiltCard } from '../components/common/TiltCard'
import { KeyRound, Upload, Check, X, ArrowLeft, ShieldCheck, FileCheck, Hash, Lock } from 'lucide-react'

interface VerifierScreenProps {
  setScreen: (s: Screen) => void
}

export function VerifierScreen({ setScreen }: VerifierScreenProps) {
  const [fileChecked, setFileChecked] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [hashProgress, setHashProgress] = useState(0)

  const handleSimulateVerification = () => {
    setIsVerifying(true)
    setHashProgress(0)

    const timer = setInterval(() => {
      setHashProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer)
          setIsVerifying(false)
          setFileChecked(true)
          return 100
        }
        return prev + 20
      })
    }, 120)
  }

  return (
    <div className="mx-auto max-w-[840px] space-y-7">
      {/* Title */}
      <div>
        <div className="eyebrow mb-2">Public Forensic Verifier / No Account Required</div>
        <h2 className="display text-4xl leading-tight md:text-5xl text-[#18232a]">
          Can this study
          <br />
          <em className="text-[#126b6a]">be independently verified?</em>
        </h2>
        <p className="mt-3 max-w-[560px] text-[13px] leading-6 text-[#617473]">
          A city engineer, local journalist, or resident can drag in the raw video file they received to test the cryptographic hash against the immutable OriginTrail Knowledge Asset.
        </p>
      </div>

      {/* 3D Tilt Card with Holographic Cryptographic Authenticity */}
      <TiltCard
        maxTilt={7}
        className="border-[#cde3dd] bg-gradient-to-br from-white/95 via-[#f9fcfb] to-[#edf6f3] shadow-xl p-7 md:p-8"
      >
        <div className="mb-6 flex items-start justify-between border-b border-[#e5ebea] pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="live-dot h-2 w-2 rounded-full bg-[#3bb9a3]" />
              <span className="mono text-[10px] uppercase tracking-wider text-[#21786c]">
                OriginTrail DKG Asset Verified
              </span>
            </div>
            <h3 className="text-[17px] font-bold text-[#18232a]">
              SP-2409-021 · Cedar Avenue Speed Study
            </h3>
            <div className="mt-1 flex items-center gap-1.5 mono text-[10px] text-[#6b8280]">
              <Lock size={12} className="text-[#3bb9a3]" />
              <span>UAL: did:dkg:otp:2043/0x8d4d4e7c9ac44c1d2e8b17f21c</span>
            </div>
          </div>

          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#def3eb] text-[#227969] shadow-sm">
            <KeyRound size={22} />
          </span>
        </div>

        {/* SHA-256 Comparison Matrix */}
        <div className="grid gap-4 py-3 md:grid-cols-2">
          <div className="rounded-xl border border-[#d6e5e1] bg-[#f8fbf9] p-4">
            <div className="eyebrow mb-1.5 text-[#21786c]">Published On-Chain Hash</div>
            <div className="break-all mono text-[11px] font-bold text-[#18232a] leading-relaxed">
              sha256: 8d4d4e7c9ac44c1d2e8b17f21c5f8832a0b12e911244
            </div>
            <div className="mt-2 text-[10px] text-[#6b8280]">Committed 24 Sep 2026 · Block 4,189,203</div>
          </div>

          <div className="rounded-xl border border-[#d6e5e1] bg-[#f8fbf9] p-4 flex flex-col justify-between">
            <div className="eyebrow mb-1.5 text-[#21786c]">Supplied Video Checksum</div>
            {fileChecked ? (
              <div className="break-all mono text-[11px] font-bold text-[#1f7364] leading-relaxed">
                sha256: 8d4d4e7c9ac44c1d2e8b17f21c5f8832a0b12e911244
              </div>
            ) : isVerifying ? (
              <div className="space-y-1.5">
                <div className="mono text-[10px] text-[#26796c]">Hashing video frames ({hashProgress}%)...</div>
                <div className="h-1.5 w-full bg-[#dbe8e4] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#3bb9a3] transition-all duration-150"
                    style={{ width: `${hashProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <button
                onClick={handleSimulateVerification}
                className="btn btn-light w-full justify-start text-[11px] shadow-sm"
              >
                <Upload size={13} /> Select Local Video to Hash & Match
              </button>
            )}
            <div className="mt-2 text-[10px] text-[#6b8280]">
              {fileChecked ? 'Exact match confirmed' : 'Awaiting video payload'}
            </div>
          </div>
        </div>

        {/* Verification Checklist */}
        <div className="my-6 space-y-2.5">
          {[
            ['Video SHA-256 Bitstream Hash Matches', fileChecked],
            ['Homography 4-Point Calibration Matrix Unaltered', true],
            ['6 Deterministic Gate Rules & Thresholds Intact', true],
            ['32 Proven Speeds & Refusal Ledger Cryptographically Sealed', true],
          ].map(([label, ok]) => (
            <div
              key={label as string}
              className="flex items-center justify-between rounded-xl bg-white/75 border border-[#e2ece9] px-4 py-3"
            >
              <span className="flex items-center gap-2.5 text-[12px] font-semibold text-[#18232a]">
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full ${
                    ok ? 'bg-[#d8f1e7] text-[#257968]' : 'bg-[#fff0df] text-[#ba6b2f]'
                  }`}
                >
                  {ok ? <Check size={14} /> : <X size={14} />}
                </span>
                {label as string}
              </span>

              <span
                className={`mono text-[9px] font-bold uppercase tracking-wider ${
                  ok ? 'text-[#2b7e6d]' : 'text-[#b46a35]'
                }`}
              >
                {ok ? 'CONFIRMED' : 'WAITING'}
              </span>
            </div>
          ))}
        </div>

        {/* Result Message Card */}
        <div
          className={`rounded-xl p-4 text-[12px] leading-relaxed ${
            fileChecked
              ? 'bg-[#dff3eb] text-[#1c6457] border border-[#b2d9cd]'
              : 'bg-[#f1f6f4] text-[#667776] border border-[#d6e5e1]'
          }`}
        >
          {fileChecked ? (
            <div className="flex items-start gap-2">
              <ShieldCheck size={18} className="shrink-0 text-[#217769] mt-0.5" />
              <span>
                <strong>Cryptographic Consensus Verified:</strong> The video you provided matches the immutable DKG publication. The speeds, refusal reasons, and calibration parameters are authentic and unaltered since publication.
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <Hash size={16} className="shrink-0 text-[#607775] mt-0.5" />
              <span>
                Provide the local MP4 file to run client-side SHA-256 hashing. All math executes locally inside your browser; no video is ever uploaded or transmitted.
              </span>
            </div>
          )}
        </div>
      </TiltCard>

      {/* Back button */}
      <div>
        <button onClick={() => setScreen('results')} className="btn btn-light shadow-sm">
          <ArrowLeft size={14} /> Back to Cedar Avenue Study
        </button>
      </div>
    </div>
  )
}
