import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  CircleHelp,
  ClipboardCheck,
  CloudUpload,
  Database,
  FileCheck2,
  FileVideo,
  Gauge,
  Globe,
  Hash,
  Home,
  Layers3,
  MapPin,
  Menu,
  MoreHorizontal,
  Play,
  Plus,
  Radio,
  ShieldCheck,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

import { Screen } from './types/study'
import { api, clipName, short } from './api'
import type { Health, StudyView, ValidationReport } from './api'
import { GATES } from './gates'
import { OverviewScreen } from './screens/OverviewScreen'
import { NewStudyScreen } from './screens/NewStudyScreen'
import { ProcessingScreen } from './screens/ProcessingScreen'
import { ResultsScreen } from './screens/ResultsScreen'
import { VerifierScreen } from './screens/VerifierScreen'
import { AccuracyScreen } from './screens/AccuracyScreen'
import GridDistortion from './components/reactbits/GridDistortion'
import DotField from './components/reactbits/DotField'
import { FieldScreen } from './screens/FieldScreen'

gsap.registerPlugin(ScrollTrigger)

const SCREENS: Screen[] = ['landing', 'overview', 'new-study', 'processing', 'results', 'verifier', 'field', 'accuracy']


export function TelemetryCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let frame = 0
    let raf = 0
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const draw = () => {
      const w = canvas.clientWidth,
        h = canvas.clientHeight
      ctx.clearRect(0, 0, w, h)
      ctx.strokeStyle = 'rgba(73, 139, 132, .11)'
      ctx.lineWidth = 1
      const gap = 32
      for (let x = 0; x < w; x += gap) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      for (let y = 0; y < h; y += gap) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }
      const beam = ((frame * 0.55) % (w + 140)) - 140
      const gradient = ctx.createLinearGradient(beam - 80, 0, beam + 80, 0)
      gradient.addColorStop(0, 'rgba(116, 226, 198, 0)')
      gradient.addColorStop(0.5, 'rgba(116, 226, 198, .16)')
      gradient.addColorStop(1, 'rgba(116, 226, 198, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(beam - 80, 0, 160, h)
      ctx.fillStyle = 'rgba(77, 165, 151, .34)'
      for (let i = 0; i < 36; i++) {
        const x = (i * 83) % Math.max(w, 1)
        const y = (i * 47 + frame * 0.15) % Math.max(h, 1)
        ctx.beginPath()
        ctx.arc(x, y, i % 5 === 0 ? 1.5 : 0.8, 0, Math.PI * 2)
        ctx.fill()
      }
      frame++
      raf = requestAnimationFrame(draw)
    }
    resize()
    window.addEventListener('resize', resize)
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])
  return <canvas ref={ref} className="telemetry-canvas" aria-hidden="true" />
}

export function MagneticButton({
  children,
  className = '',
  onClick,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  return (
    <motion.button
      onClick={onClick}
      onPointerMove={(event) => {
        const box = event.currentTarget.getBoundingClientRect()
        setOffset({
          x: (event.clientX - box.left - box.width / 2) * 0.08,
          y: (event.clientY - box.top - box.height / 2) * 0.08,
        })
      }}
      onPointerLeave={() => setOffset({ x: 0, y: 0 })}
      animate={{ x: offset.x, y: offset.y }}
      transition={{ type: 'spring', stiffness: 320, damping: 20 }}
      className={`btn magnetic-btn ${className}`}
    >
      {children}
    </motion.button>
  )
}

function CountUp({ value, suffix = '' }: { value: string; suffix?: string }) {
  const numeric = Number(value.replace(/[^0-9.]/g, ''))
  const [shown, setShown] = useState(0)
  useEffect(() => {
    let start = 0
    const timer = window.setInterval(() => {
      start += Math.max(numeric / 16, 0.1)
      if (start >= numeric) {
        setShown(numeric)
        window.clearInterval(timer)
      } else setShown(start)
    }, 34)
    return () => window.clearInterval(timer)
  }, [numeric])
  return (
    <>
      {numeric % 1 ? shown.toFixed(1) : Math.round(shown)}
      {suffix}
    </>
  )
}

function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <div onClick={onClick} className="flex items-center gap-3 cursor-pointer">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#182b30] text-[#9ce3d2] shadow-sm">
        <Gauge size={18} />
      </span>
      <div className="sidebar-copy">
        <div className="text-[14px] font-bold tracking-[-.04em]">StreetProof</div>
        <div className="mono text-[11px] uppercase tracking-[.15em] text-[#586364]">
          evidence / not opinion
        </div>
      </div>
    </div>
  )
}

function Sidebar({ screen, setScreen }: { screen: Screen; setScreen: (s: Screen) => void }) {
  const links = [
    { id: 'landing' as Screen, label: 'Public Portal', icon: Globe },
    { id: 'overview' as Screen, label: 'Workspace', icon: Home },
    { id: 'new-study' as Screen, label: 'New study', icon: Plus },
    { id: 'results' as Screen, label: 'Current study', icon: BarChart3 },
    { id: 'field' as Screen, label: 'Every detection (3D)', icon: Layers3 },
    { id: 'accuracy' as Screen, label: 'Accuracy', icon: Target },
    { id: 'verifier' as Screen, label: 'Verify a video', icon: ShieldCheck },
  ]

  return (
    <aside className="sidebar flex shrink-0 flex-col px-4 py-5 md:px-5">
      <Logo onClick={() => setScreen('landing')} />

      <div className="sidebar-label eyebrow mb-3 mt-10 px-2">Navigation</div>
      <nav className="space-y-1">
        {links.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setScreen(id)}
            className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
              screen === id || (screen === 'processing' && id === 'new-study')
                ? 'bg-[#e5f2ee] text-[#126b6a] font-semibold'
                : 'text-[#576363] hover:bg-[#f0f5f3] hover:text-[#1e4548]'
            }`}
          >
            <Icon size={16} />
            <span className="sidebar-label">{label}</span>
            {id === 'new-study' && (
              <span className="sidebar-label ml-auto rounded-full bg-[#f7c37b] px-1.5 py-0.5 text-[11px] text-[#76501e]">
                start
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer mt-auto border-t border-[#dce5e3] pt-4">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-[#dceee8] text-[12.5px] font-bold text-[#266963]">
            SB
          </div>
          <div>
            <div className="text-[12.5px] font-semibold">Sidharth & Basu</div>
            <div className="text-[12px] text-[#5a6263]">Resident workspace</div>
          </div>
          <MoreHorizontal size={15} className="ml-auto text-[#5a6263]" />
        </div>
      </div>
    </aside>
  )
}

function Topbar({ screen, setScreen }: { screen: Screen; setScreen: (s: Screen) => void }) {
  const titles: Record<Screen, string> = {
    landing: 'Public Portal',
    overview: 'Workspace Overview',
    'new-study': 'New Speed Study',
    processing: 'Processing Evidence',
    results: 'Study Results & Evidence',
    verifier: 'Cryptographic Verifier',
    field: 'Every detection',
    accuracy: 'Accuracy',
  }

  return (
    <header className="flex items-center justify-between border-b border-[#dce5e3] px-5 py-4 md:px-9 bg-white/70 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setScreen('landing')}
          className="mobile-nav rounded-lg border border-[#dce5e3] p-2 text-[#516464]"
        >
          <Menu size={16} />
        </button>
        <div>
          <div className="eyebrow mb-0.5">StreetProof / {screen}</div>
          <h1 className="text-[15px] font-semibold tracking-[-.02em] text-[#18232a]">
            {titles[screen]}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <HealthPill />
        <button
          onClick={() => setScreen('landing')}
          className="rounded-lg border border-[#dce5e3] bg-white p-2 text-[#576363] hover:bg-[#f0f5f3]"
          title="Return to Public Landing Page"
        >
          <Globe size={16} />
        </button>
      </div>
    </header>
  )
}

function HealthPill() {
  const [health, setHealth] = useState<Health | null>(null)
  const [down, setDown] = useState(false)
  useEffect(() => {
    api.health().then(setHealth).catch(() => setDown(true))
  }, [])
  const text = down ? 'StreetProof server offline' : !health ? 'Connecting…' : health.knowledgeMode === 'dkg-cli' ? 'Livepeer + OriginTrail DKG node' : 'Livepeer + local ledger (not the DKG)'
  const dot = down ? 'bg-[#d65a4f]' : health?.knowledgeMode === 'dkg-cli' ? 'bg-[#3db595]' : 'bg-[#e0a24a]'
  return (
    <div className="hidden items-center gap-2 rounded-full border border-[#dce5e3] bg-white px-3 py-1.5 text-[12.5px] text-[#536363] sm:flex shadow-sm">
      <span className={`live-dot h-2 w-2 rounded-full ${dot}`} />
      <span>{text}</span>
    </div>
  )
}

function useShowcase() {
  const [study, setStudy] = useState<StudyView | null>(null)
  const [validation, setValidation] = useState<ValidationReport | null>(null)
  const [detections, setDetections] = useState<number | null>(null)
  const [vehicles, setVehicles] = useState<number | null>(null)
  useEffect(() => {
    api.studies().then((all) => {
      const done = all.filter((s) => s.status === 'DONE' && (s.summary?.vehiclesProven ?? 0) > 0)
      setStudy(done.find((s) => s.published) ?? done[0] ?? null)
    }).catch(() => undefined)
    api.validation().then(setValidation).catch(() => undefined)
    api.field().then((f) => {
      setDetections(f.detections)
      setVehicles(f.vehicles.length)
    }).catch(() => undefined)
  }, [])
  return { study, validation, detections, vehicles }
}

function MotionDirector() {
  useEffect(() => {
    const lenis = new Lenis({ autoRaf: true, anchors: true })
    const context = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.reveal-up').forEach((element) => {
        gsap.fromTo(
          element,
          { opacity: 0, y: 34 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: { trigger: element, start: 'top 86%', once: true },
          }
        )
      })
      gsap.utils.toArray<HTMLElement>('.gate-card').forEach((element, index) => {
        gsap.fromTo(
          element,
          { rotateX: 8, transformOrigin: 'center bottom' },
          {
            rotateX: 0,
            duration: 0.8,
            delay: index * 0.04,
            ease: 'power3.out',
            scrollTrigger: { trigger: element, start: 'top 92%', once: true },
          }
        )
      })
    })
    return () => {
      context.revert()
      lenis.destroy()
    }
  }, [])
  return null
}

function Landing({ setScreen }: { setScreen: (s: Screen) => void }) {
  const gates = GATES.filter((g) => g.code !== 'NO_FRAME_RATE').map((g, i) => [String(i + 1).padStart(2, '0'), g.title, g.rule, g.why])
  const { study: showcase, validation, detections, vehicles } = useShowcase()

  return (
    <div className="landing-page">
      <MotionDirector />
      <div className="landing-aurora landing-aurora-one" />
      <div className="landing-aurora landing-aurora-two" />
      <header className="landing-nav">
        <div className="flex items-center gap-3">
          <Logo onClick={() => setScreen('overview')} />
          <span className="hidden h-5 w-px bg-white/15 min-[1500px]:block" />
          <span className="hidden items-center gap-2 mono text-[11px] uppercase tracking-[.12em] text-[#94afa9] min-[1500px]:flex">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-[#9ce3d2]" /> Livepeer + OriginTrail DKG
          </span>
        </div>
        <nav className="hidden items-center gap-6 xl:flex">
          <a href="#proof" className="landing-link">
            Why proof gates?
          </a>
          <a href="#pipeline" className="landing-link">
            Forensic pipeline
          </a>
          <a href="#registry" className="landing-link">
            DKG registry
          </a>
          <a href="#impact" className="landing-link">
            Impact
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScreen('overview')}
            className="landing-ghost hidden sm:inline-flex"
          >
            <Home size={13} /> Open Resident Workspace
          </button>
          <button
            onClick={() => setScreen('verifier')}
            className="landing-ghost hidden md:inline-flex"
          >
            <Hash size={13} /> Verify a hash
          </button>
          <MagneticButton onClick={() => setScreen('new-study')} className="landing-cta">
            Conduct a study <ArrowRight size={13} />
          </MagneticButton>
        </div>
      </header>

      <main>
        <section className="landing-hero relative overflow-hidden">
          {/* React Bits GridDistortion interactive WebGL background */}
          <div className="absolute inset-0 z-0 overflow-hidden opacity-45 pointer-events-none">
            <GridDistortion
              imageSrc="/street_bg.jpg"
              grid={16}
              mouse={0.14}
              strength={0.2}
              relaxation={0.92}
            />
            {/* Cinematic dark vignettes for maximum contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0e1a1f] via-transparent to-[#0e1a1f]/80 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0e1a1f]/95 via-[#0e1a1f]/40 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,#0e1a1f_90%)] pointer-events-none" />
          </div>

          <div className="hero-copy relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="eyebrow flex items-center gap-2 text-[#83bdb1]"
            >
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-[#9ce3d2]" /> Civic evidence platform ·
              every number checkable
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="landing-title"
            >
              Turn “it feels fast”
              <br />
              <em>into something provable.</em>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.18 }}
              className="landing-lede"
            >
              StreetProof turns a phone video of your street into a speed study a city can check: every number is either proven or refused with a reason, and the record lives on the OriginTrail DKG.
            </motion.p>
            <div className="landing-actions">
              <MagneticButton
                onClick={() => setScreen('new-study')}
                className="landing-cta landing-cta-large"
              >
                <CloudUpload size={15} /> Upload road footage <ArrowRight size={15} />
              </MagneticButton>
              <button onClick={() => setScreen('overview')} className="landing-secondary">
                <span className="grid h-7 w-7 place-items-center rounded-full border border-white/15">
                  <Play size={11} fill="currentColor" />
                </span>{' '}
                Inspect the real studies
              </button>
            </div>
            <div className="landing-proof-line">
              <span className="mono">built for residents</span>
              <span className="landing-rule" />
              <span className="mono">trusted by the evidence</span>
            </div>
          </div>

          <div className="landing-visual">
            <div className="visual-topline">
              <span className="eyebrow text-[#82b1aa]">{showcase ? 'Real study, annotated by StreetProof' : 'Street telemetry'}</span>
              <span className="mono text-[11px] text-[#789e9a]">{showcase ? clipName(showcase.sourceName) : 'waiting for a study'}</span>
            </div>
            <div className="landing-video">
              <TelemetryCanvas />
              {showcase?.links.video ? (
                <video src={showcase.links.video} className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline />
              ) : (
                <>
                  <div className="road-plane" />
                  <div className="road-line road-line-one" />
                  <div className="road-line road-line-two" />
                  <div className="scan-beam" />
                </>
              )}
              <div className="visual-corner visual-corner-tl" />
              <div className="visual-corner visual-corner-br" />
              <div className="visual-bottom">
                <span className="mono">{showcase ? `${showcase.sampleFps} FPS SAMPLED` : 'NO STUDY YET'}</span>
                <span className="mono">{showcase?.calibrationUal ? 'CALIBRATION FROM DKG' : showcase?.calibration ? showcase.calibration.mode.replace('_', ' ') : ''}</span>
                <span className="mono">{showcase?.summary ? `${showcase.summary.vehiclesProven} PROVEN / ${showcase.summary.vehiclesObserved} TRACKED` : ''}</span>
              </div>
            </div>
            <div className="landing-hud">
              <div>
                <span>Livepeer inference</span>
                <strong>
                  yolo-detect <b>·</b> every frame
                </strong>
              </div>
              <div>
                <span>Proof state</span>
                <strong className="text-[#9ce3d2]">{showcase?.summary ? `${showcase.summary.vehiclesObserved} tracked / ${showcase.summary.vehiclesProven} proven` : '–'}</strong>
              </div>
              <div>
                <span>Video hash</span>
                <strong>{showcase ? short(showcase.videoSha256, 4, 7) : '–'}</strong>
              </div>
            </div>
          </div>
        </section>

        {/* Subtle Interactive DotField Transition after Hero */}
        <div className="relative w-full h-[170px] md:h-[200px] overflow-hidden bg-[#0c181c] border-y border-white/10 select-none">
          <DotField
            dotRadius={1.5}
            dotSpacing={16}
            bulgeStrength={75}
            glowRadius={175}
            sparkle={true}
            waveAmplitude={1.2}
            gradientFrom="rgba(59, 185, 163, 0.45)"
            gradientTo="rgba(156, 227, 210, 0.15)"
            glowColor="#3bb9a3"
          />
          {/* Centered Floating Trust Ribbon */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 px-4">
            <div className="landing-trust reveal-up !bg-[#0b1f24]/80 !border !border-white/15 !rounded-2xl !py-3 !px-6 backdrop-blur-md shadow-xl">
              <span>Evidence over anecdotes</span>
              <i />
              <span>Local math, public proof</span>
              <i />
              <span>Only fingerprints published</span>
              <i />
              <span>Built for the 85th percentile</span>
            </div>
          </div>
          {/* Subtle gradient transitions */}
          <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-[#0e1a1f] to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#f6f8f7] to-transparent pointer-events-none" />
        </div>

        <section id="proof" className="landing-section reveal-up proof-section">
          <div className="section-intro">
            <div>
              <div className="eyebrow text-[#43786f]">01 / the proof gate standard</div>
              <h2 className="landing-h2">
                A number is only
                <br />
                <em>useful when it survives.</em>
              </h2>
            </div>
            <p>
              Most computer vision gives you a guess. StreetProof gives you a gate ledger. Every vehicle must clear a fixed set of checks before its speed can enter the study, or it is refused with the reason.
            </p>
          </div>
          <div className="gate-grid">
            {gates.map(([number, title, detail, note], i) => (
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.06 }}
                key={number}
                className="gate-card"
              >
                <div className="gate-number">{number}</div>
                <div className="gate-icon">
                  {i === 0 ? (
                    <Target size={17} />
                  ) : i === 1 ? (
                    <Radio size={17} />
                  ) : i === 2 ? (
                    <Layers3 size={17} />
                  ) : i === 3 ? (
                    <MapPin size={17} />
                  ) : i === 4 ? (
                    <BarChart3 size={17} />
                  ) : (
                    <Gauge size={17} />
                  )}
                </div>
                <h3>{title}</h3>
                <strong>{detail}</strong>
                <p>{note}</p>
                <div className="gate-scan" />
              </motion.div>
            ))}
          </div>

          <div className="opinion-vs-proof">
            <div>
              <span className="eyebrow text-[#755c4a]">Standard computer vision</span>
              <h3>“The model saw a car.”</h3>
              <p>
                Boxes, labels, and a confident guess. No calibration. No provenance. No way to explain a refusal.
              </p>
              <span className="comparison-badge comparison-bad">opinion / opaque</span>
            </div>
            <div className="comparison-arrow">
              <ArrowRight size={18} />
            </div>
            <div>
              <span className="eyebrow text-[#43786f]">StreetProof refusal gate</span>
              <h3>“This speed is defensible.”</h3>
              <p>
                Known scale, known time, a steady track, a stable box, and a record on the OriginTrail DKG that anyone with the video can check.
              </p>
              <span className="comparison-badge comparison-good">fact / inspectable</span>
            </div>
          </div>
        </section>

        <section id="pipeline" className="landing-section pipeline-section">
          <div className="section-intro">
            <div>
              <div className="eyebrow text-[#43786f]">02 / the forensic pipeline</div>
              <h2 className="landing-h2">
                From a phone clip
                <br />
                <em>to a city-ready study.</em>
              </h2>
            </div>
            <p>
              Heavy inference is delegated to Livepeer. Tracking, calibration, speed math, and the decision to refuse stay local and deterministic.
            </p>
          </div>
          <div className="pipeline-track">
            {[
              ['01', 'Capture', 'Fixed camera footage', CloudUpload],
              ['02', 'Calibrate', 'known distance, or reuse one from the DKG', Target],
              ['03', 'Detect', 'Livepeer yolo-detect', Zap],
              ['04', 'Track', 'Local IoU matching', Layers3],
              ['05', 'Publish', 'DKG knowledge asset', Database],
            ].map(([num, title, detail, Icon], i) => (
              <div className="pipeline-step" key={num as string}>
                <div className="pipeline-node">
                  <span>{num as string}</span>
                  <Icon size={17} />
                </div>
                <div>
                  <h3>{title as string}</h3>
                  <p>{detail as string}</p>
                </div>
                {i < 4 && <div className="pipeline-connector" />}
              </div>
            ))}
          </div>
        </section>

        <section id="registry" className="landing-section registry-section">
          <div className="registry-card">
            <div className="registry-copy">
              <div className="eyebrow text-[#82bdb0]">03 / provenance, not paperwork</div>
              <h2 className="landing-h2 text-white">
                Your evidence should
                <br />
                <em>outlive your browser tab.</em>
              </h2>
              <p>
                StreetProof publishes the video's fingerprint, the calibration it used, the thresholds, every proven speed and refusal reason, and the Livepeer capability used, as a Knowledge Asset on the OriginTrail DKG.
              </p>
              <button
                onClick={() => setScreen('verifier')}
                className="landing-secondary registry-button"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[#9ce3d2] text-[#143437]">
                  <ShieldCheck size={13} />
                </span>{' '}
                Open the public verifier <ArrowRight size={14} />
              </button>
            </div>
            <div className="registry-terminal">
              <div className="terminal-top">
                <span className="live-dot h-1.5 w-1.5 rounded-full bg-[#9ce3d2]" /> OriginTrail / knowledge asset
              </div>
              <div className="terminal-line terminal-key">UAL</div>
              <div className="terminal-value break-all">{showcase?.published ? short(showcase.published.ual, 34, 14) : 'publish a study to see its locator'}</div>
              <div className="terminal-line">SHA-256 / video</div>
              <div className="terminal-value">{showcase?.published ? short(showcase.videoSha256, 12, 8) : '–'}</div>
              <div className="terminal-line">INTEGRITY CHECK</div>
              <div className="terminal-integrity">
                <Check size={15} /> one changed byte gives MISMATCH
              </div>
              <div className="terminal-foot mono">queryable · tamper-evident · V10 testnet</div>
            </div>
          </div>
        </section>

        <section id="impact" className="landing-section impact-section">
          <div className="section-intro">
            <div>
              <div className="eyebrow text-[#43786f]">04 / civic impact</div>
              <h2 className="landing-h2">
                Small cameras.
                <br />
                <em>Serious leverage.</em>
              </h2>
            </div>
            <p>
              Turn one resident’s concern into a shared, inspectable record for a traffic committee, councillor, or journalist.
            </p>
          </div>
          <div className="impact-grid">
            <div className="impact-stat">
              <div className="stat-number">{detections != null ? <CountUp value={String(detections)} /> : '–'}</div>
              <span>Livepeer detections</span>
            </div>
            <div className="impact-stat">
              <div className="stat-number">{vehicles != null ? <CountUp value={String(vehicles)} /> : '–'}</div>
              <span>vehicles tracked</span>
            </div>
            <div className="impact-stat">
              <div className="stat-number">{validation && validation.clips > 0 ? `${validation.proven}/${validation.clips}` : '–'}</div>
              <span>unseen clips proven</span>
            </div>
            <div className="impact-stat">
              <div className="stat-number">{validation?.meanAbsErrorPercent != null ? <CountUp value={String(validation?.meanAbsErrorPercent)} suffix="%" /> : '–'}</div>
              <span>mean error, held-out clips</span>
            </div>
          </div>

          <div className="case-study">
            <div>
              <div className="eyebrow">The accuracy test / VS13 benchmark</div>
              <h3>Measured against known speeds</h3>
              <p>
                {validation && validation.clips > 0
                  ? `Calibrated on ${validation.calibrationClips.length} passes stored on the DKG, then measured ${validation.clips} clips it had never seen: ${validation.proven} proven, worst error ${validation.maxAbsErrorPercent}%.`
                  : 'Run the accuracy test to see how close StreetProof gets to known speeds.'}
              </p>
            </div>
            <div className="case-metric">
              <span className="display">{validation?.meanAbsErrorPercent != null ? validation?.meanAbsErrorPercent.toFixed(1) : '–'}</span>
              <span>
                %
                <br />
                mean error
              </span>
            </div>
            <button
              onClick={() => setScreen('accuracy')}
              className="grid h-11 w-11 place-items-center rounded-full border border-[#cbdad6] text-[#27766c] transition-transform hover:rotate-45"
            >
              <ArrowRight size={17} />
            </button>
          </div>
        </section>
      </main>

      <footer className="landing-footer reveal-up">
        <div className="footer-brand">
          <Logo onClick={() => setScreen('overview')} />
          <p>
            Evidence, not opinion.
            <br />
            Built for safer streets.
          </p>
        </div>
        <div className="footer-links">
          <div>
            <span className="eyebrow">Platform</span>
            <button onClick={() => setScreen('overview')} className="text-left">
              Resident Workspace
            </button>
            <a href="#proof">Proof gates</a>
            <a href="#pipeline">Forensic pipeline</a>
            <a href="#registry">DKG registry</a>
          </div>
          <div>
            <span className="eyebrow">Disclosure</span>
            <span>Livepeer inference</span>
            <span>OriginTrail provenance</span>
            <span>Only fingerprints and results are published</span>
          </div>
        </div>
        <div className="footer-bottom mono">
          <span>STREETPROOF / OPEN EVIDENCE</span>
          <span>© 2026 · resident-built</span>
        </div>
      </footer>
    </div>
  )
}

export default function App() {
  const [screen, setScreenState] = useState<Screen>(() => {
    const hash = window.location.hash.replace('#', '') as Screen
    return SCREENS.includes(hash) ? hash : 'landing'
  })
  const setScreen = (next: Screen) => {
    setScreenState(next)
    window.history.replaceState(null, '', next === 'landing' ? window.location.pathname : `#${next}`)
    window.scrollTo(0, 0)
  }
  const [studyId, setStudyIdState] = useState<string | null>(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('study')
    if (fromUrl) return fromUrl
    try {
      return window.sessionStorage.getItem('streetproof.study')
    } catch {
      return null
    }
  })
  const [verifyUal, setVerifyUal] = useState<string | null>(null)
  const setStudyId = useCallback((id: string | null) => {
    setStudyIdState(id)
    try {
      if (id) window.sessionStorage.setItem('streetproof.study', id)
    } catch {
      return
    }
  }, [])
  const openStudy = useCallback((id: string) => {
    setStudyId(id)
    setScreen('results')
  }, [])
  const onProcessingDone = useCallback((id: string) => {
    setStudyId(id)
    setScreen('results')
  }, [])

  const content = useMemo(() => {
    switch (screen) {
      case 'overview':
        return <OverviewScreen setScreen={setScreen} openStudy={openStudy} />
      case 'new-study':
        return (
          <NewStudyScreen
            onStarted={(id) => {
              setStudyId(id)
              setScreen('processing')
            }}
          />
        )
      case 'processing':
        return <ProcessingScreen studyId={studyId} onDone={onProcessingDone} onBack={() => setScreen('new-study')} />
      case 'results':
        return (
          <ResultsScreen
            studyId={studyId}
            onVerify={(ual) => {
              setVerifyUal(ual)
              setScreen('verifier')
            }}
            onField={() => setScreen('field')}
            onBack={() => setScreen('overview')}
          />
        )
      case 'verifier':
        return <VerifierScreen initialUal={verifyUal} />
      case 'accuracy':
        return <AccuracyScreen openStudy={openStudy} />
      default:
        return <OverviewScreen setScreen={setScreen} openStudy={openStudy} />
    }
  }, [screen, studyId, verifyUal, openStudy, onProcessingDone, setStudyId])

  if (screen === 'landing') {
    return <Landing setScreen={setScreen} />
  }

  if (screen === 'field') {
    return <FieldScreen onExit={() => setScreen('overview')} onOpenStudy={openStudy} />
  }

  return (
    <div className="app-shell relative flex min-h-screen">
      <TelemetryCanvas />
      <Sidebar screen={screen} setScreen={setScreen} />
      <div className="main-panel flex min-h-screen flex-1 flex-col">
        <Topbar screen={screen} setScreen={setScreen} />
        <main className="flex-1 px-5 py-8 md:px-9 md:py-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={screen}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {content}
            </motion.div>
          </AnimatePresence>
        </main>
        <footer className="flex flex-col justify-between gap-2 border-t border-[#dce5e3] px-5 py-4 text-[12px] text-[#586262] md:flex-row md:px-9 bg-white/50 backdrop-blur-sm">
          <span>StreetProof · resident evidence tool, not a certified enforcement device.</span>
          <span className="mono">local analysis · Livepeer detection · DKG provenance</span>
        </footer>
      </div>
    </div>
  )
}
