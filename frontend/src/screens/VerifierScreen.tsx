import { useEffect, useRef, useState } from 'react'
import { Check, FileVideo, Hash, KeyRound, Loader2, Lock, ShieldAlert, ShieldCheck, Upload, X } from 'lucide-react'
import { TiltCard } from '../components/common/TiltCard'
import { api, clipName, sha256OfFile, short } from '../api'
import type { StudyView, VerifyResult } from '../api'

interface VerifierScreenProps {
  initialUal: string | null
}

export function VerifierScreen({ initialUal }: VerifierScreenProps) {
  const [ual, setUal] = useState(initialUal ?? '')
  const [published, setPublished] = useState<StudyView[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [hash, setHash] = useState<string | null>(null)
  const [tampered, setTampered] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.studies().then((all) => {
      const list = all.filter((s) => s.published)
      setPublished(list)
      if (!initialUal && list[0]) setUal(list[0].published!.ual)
    }).catch(() => undefined)
  }, [initialUal])

  const check = async (f: File, tamper: boolean) => {
    setError(null)
    setResult(null)
    setBusy(tamper ? 'tamper' : 'hash')
    try {
      const sha = await sha256OfFile(f, tamper)
      setHash(sha)
      setTampered(tamper)
      setBusy('dkg')
      setResult(await api.verifyHash(sha, ual.trim() || null))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const chosen = published.find((s) => s.published?.ual === ual.trim())
  const outcome = result?.outcome

  return (
    <div className="mx-auto max-w-[880px] space-y-7">
      <div>
        <div className="eyebrow mb-2">Public verifier / no account needed</div>
        <h2 className="display text-4xl leading-tight md:text-5xl text-[#18232a]">
          Is this the video
          <br />
          <em className="text-[#126b6a]">the study measured?</em>
        </h2>
        <p className="mt-3 max-w-[600px] text-[13px] leading-6 text-[#536463]">
          A city engineer, journalist or neighbour picks the video they were given. Your browser computes its SHA-256 fingerprint. Only the fingerprint goes to the StreetProof server, which looks up the published study on the OriginTrail DKG and compares.
        </p>
      </div>

      <TiltCard maxTilt={5} className="border-[#cde3dd] bg-gradient-to-br from-white/95 via-[#f9fcfb] to-[#edf6f3] shadow-xl p-7 md:p-8">
        <div className="space-y-5">
          <div>
            <div className="eyebrow mb-2 flex items-center gap-2"><Lock size={11} className="text-[#3bb9a3]" /> Study on the DKG</div>
            {published.length > 0 && (
              <select value={chosen ? ual : ''} onChange={(e) => setUal(e.target.value)} className="mb-2 w-full rounded-lg border border-[#dce5e3] bg-white px-3 py-2 text-[13px]">
                <option value="">Paste a locator below, or pick a published study</option>
                {published.map((s) => (
                  <option key={s.id} value={s.published!.ual}>{s.streetLabel || clipName(s.sourceName)} · {clipName(s.sourceName)} · {s.id}</option>
                ))}
              </select>
            )}
            <input value={ual} onChange={(e) => setUal(e.target.value)} placeholder="did:dkg:context-graph:…" className="mono w-full rounded-lg border border-[#dce5e3] bg-white px-3 py-2 text-[12.5px]" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-[#d6e5e1] bg-[#f8fbf9] p-4">
              <div className="eyebrow mb-1.5 text-[#21786c]">Fingerprint on the DKG</div>
              <div className="break-all mono text-[12.5px] font-bold leading-relaxed text-[#18232a]">
                {result?.recordedSha256 ?? (chosen ? chosen.videoSha256 : '–')}
              </div>
              <div className="mt-2 text-[12px] text-[#526463]">{result?.recordedSha256 ? 'read from the Knowledge Asset just now' : chosen ? 'expected, from the study record' : 'pick or paste a study'}</div>
            </div>
            <div className="flex flex-col justify-between rounded-xl border border-[#d6e5e1] bg-[#f8fbf9] p-4">
              <div className="eyebrow mb-1.5 text-[#21786c]">Fingerprint of your video</div>
              {hash ? (
                <div className={`break-all mono text-[12.5px] font-bold leading-relaxed ${outcome === 'MATCH' ? 'text-[#1f7364]' : outcome ? 'text-[#b1462f]' : 'text-[#18232a]'}`}>{hash}</div>
              ) : busy ? (
                <div className="flex items-center gap-2 mono text-[12px] text-[#26796c]"><Loader2 size={12} className="animate-spin" /> hashing in your browser…</div>
              ) : (
                <div className="text-[12.5px] text-[#526463]">No video chosen yet</div>
              )}
              <div className="mt-2 text-[12px] text-[#526463]">{file ? `${file.name}${tampered ? ' with one byte changed' : ''}` : ''}</div>
            </div>
          </div>

          <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) {
              setFile(f)
              check(f, false)
            }
          }} />
          <div className="flex flex-wrap gap-2.5">
            <button onClick={() => fileRef.current?.click()} disabled={busy !== null} className="btn btn-dark shadow-md">
              {busy === 'hash' || busy === 'dkg' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              <span>{file ? 'Choose another video' : 'Choose the video to check'}</span>
            </button>
            {file && (
              <button onClick={() => check(file, true)} disabled={busy !== null} className="btn btn-light">
                {busy === 'tamper' ? <Loader2 size={14} className="animate-spin" /> : <FileVideo size={14} />}
                <span>Try it with one byte changed</span>
              </button>
            )}
          </div>

          {error && <div className="rounded-xl border border-[#f1c8bd] bg-[#fdf1ee] px-4 py-3 text-[13px] text-[#9b3d2a]">{error}</div>}

          {result && (
            <div className={`rounded-xl border p-4 text-[13px] leading-relaxed ${outcome === 'MATCH' ? 'border-[#b2d9cd] bg-[#dff3eb] text-[#1c6457]' : outcome === 'MISMATCH' ? 'border-[#f1c8bd] bg-[#fdf1ee] text-[#9b3d2a]' : 'border-[#e3d9c5] bg-[#fbf6ec] text-[#7a5d2c]'}`}>
              <div className="flex items-start gap-2.5">
                {outcome === 'MATCH' ? <ShieldCheck size={18} className="mt-0.5 shrink-0" /> : outcome === 'MISMATCH' ? <ShieldAlert size={18} className="mt-0.5 shrink-0" /> : <Hash size={18} className="mt-0.5 shrink-0" />}
                <div>
                  <div className="mono text-[12.5px] font-bold tracking-wider">{outcome}</div>
                  <div>{result.message}</div>
                  {result.summary && (
                    <div className="mt-2 text-[12.5px]">
                      The study it matches: {result.summary.vehiclesProven} of {result.summary.vehiclesObserved} vehicles proven{result.summary.v85Kmh != null ? `, 85th percentile ${result.summary.v85Kmh.toFixed(1)} km/h` : ''}.
                    </div>
                  )}
                  {result.ual && <div className="mono mt-2 break-all text-[12px] opacity-80"><KeyRound size={10} className="mr-1 inline" />{short(result.ual, 40, 16)}</div>}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {[
              ['The video is byte-for-byte the one that was measured', outcome === 'MATCH' ? true : outcome ? false : null],
              ['The fingerprint was read from the DKG, not from this website', result?.recordedSha256 && result.ual?.startsWith('did:dkg:') ? true : null],
              ['Your video never left your computer', hash ? true : null],
            ].map(([label, ok]) => (
              <div key={label as string} className="flex items-center justify-between rounded-xl border border-[#e2ece9] bg-white/75 px-4 py-2.5">
                <span className="flex items-center gap-2.5 text-[13px] font-semibold text-[#18232a]">
                  <span className={`grid h-6 w-6 place-items-center rounded-full ${ok === true ? 'bg-[#d8f1e7] text-[#257968]' : ok === false ? 'bg-[#fbe4df] text-[#b1462f]' : 'bg-[#eef3f2] text-[#576361]'}`}>
                    {ok === true ? <Check size={14} /> : ok === false ? <X size={14} /> : <Hash size={12} />}
                  </span>
                  {label as string}
                </span>
                <span className={`mono text-[11px] font-bold uppercase tracking-wider ${ok === true ? 'text-[#2b7e6d]' : ok === false ? 'text-[#b1462f]' : 'text-[#576361]'}`}>
                  {ok === true ? 'confirmed' : ok === false ? 'failed' : 'waiting'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </TiltCard>
    </div>
  )
}
