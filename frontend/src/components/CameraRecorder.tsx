import { useEffect, useRef, useState } from 'react'
import { Circle, Square, Video, X } from 'lucide-react'

const MAX_SECONDS = 60
const TYPES = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']

interface CameraRecorderProps {
  disabled: boolean
  onRecorded: (file: File) => void
}

type Phase = 'idle' | 'preview' | 'recording'

function pickType() {
  if (typeof MediaRecorder === 'undefined') return null
  return TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? null
}

export function CameraRecorder({ disabled, onRecorded }: CameraRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const supported = typeof window !== 'undefined' && window.isSecureContext && !!navigator.mediaDevices?.getUserMedia && pickType() !== null

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  useEffect(() => () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    stopStream()
  }, [])

  useEffect(() => {
    if (phase !== 'recording') return
    const started = Date.now()
    const timer = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - started) / 1000)
      setSeconds(elapsed)
      if (elapsed >= MAX_SECONDS && recorderRef.current?.state === 'recording') recorderRef.current.stop()
    }, 250)
    return () => window.clearInterval(timer)
  }, [phase])

  const open = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: false,
      })
      streamRef.current = stream
      setPhase('preview')
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream
      })
    } catch (e) {
      setError(e instanceof Error && e.name === 'NotAllowedError' ? 'Camera access was blocked. Allow it in the browser and try again.' : 'No camera could be opened on this device.')
      stopStream()
    }
  }

  const start = () => {
    const stream = streamRef.current
    const type = pickType()
    if (!stream || !type) return
    const chunks: Blob[] = []
    const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 4_000_000 })
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    recorder.onstop = () => {
      stopStream()
      setPhase('idle')
      const blob = new Blob(chunks, { type })
      if (blob.size === 0) {
        setError('The recording came out empty. Try again.')
        return
      }
      const ext = type.startsWith('video/mp4') ? 'mp4' : 'webm'
      const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')
      onRecorded(new File([blob], `camera-${stamp}.${ext}`, { type: type.split(';')[0] }))
    }
    recorderRef.current = recorder
    setSeconds(0)
    recorder.start(1000)
    setPhase('recording')
  }

  const stop = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  const cancel = () => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.onstop = null
      recorderRef.current.stop()
    }
    stopStream()
    setPhase('idle')
  }

  if (!supported) {
    return (
      <div className="rounded-xl border border-[#dce5e3] bg-[#fafdfe] px-4 py-3 text-[12.5px] text-[#526463]">
        Recording in the browser needs a camera and a secure page (https or this computer's localhost). Record on your phone and upload the file instead.
      </div>
    )
  }

  if (phase === 'idle') {
    return (
      <div className="space-y-2">
        <button onClick={open} disabled={disabled} className="btn btn-light w-full justify-center disabled:opacity-60">
          <Video size={16} /> Record with this device's camera
        </button>
        {error && <div className="text-[12.5px] text-[#a5412c]">{error}</div>}
      </div>
    )
  }

  const mm = Math.floor(seconds / 60)
  const ss = String(seconds % 60).padStart(2, '0')
  return (
    <div className="space-y-3 rounded-xl border border-[#c6d7d4] bg-[#0f1c20] p-3">
      <div className="relative overflow-hidden rounded-lg bg-black">
        <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full object-cover" />
        {phase === 'recording' && (
          <span className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 mono text-[12.5px] text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#e5584a]" /> {mm}:{ss} / 1:00
          </span>
        )}
      </div>
      <div className="text-[12.5px] leading-relaxed text-[#b5c9c7]">
        Hold the camera still, or prop it up, with the road in view. Stop when a few cars have passed.
      </div>
      <div className="flex gap-2">
        {phase === 'preview' ? (
          <button onClick={start} className="btn flex-1 justify-center bg-[#a5e5d4] font-semibold text-[#163d3e] hover:bg-white">
            <Circle size={14} className="fill-[#e5584a] text-[#e5584a]" /> Start recording
          </button>
        ) : (
          <button onClick={stop} className="btn flex-1 justify-center bg-[#a5e5d4] font-semibold text-[#163d3e] hover:bg-white">
            <Square size={13} className="fill-[#163d3e]" /> Stop and use this clip
          </button>
        )}
        <button onClick={cancel} className="btn border border-white/20 text-white hover:bg-white/10">
          <X size={15} /> Cancel
        </button>
      </div>
    </div>
  )
}
