import { useState } from 'react'
import { Screen } from '../types/study'
import { RoadCalibrator } from '../components/calibration/RoadCalibrator'
import { ArrowLeft, ArrowRight, Check, CloudUpload, FileVideo, Info, Play, ShieldCheck, Zap } from 'lucide-react'

interface NewStudyScreenProps {
  setScreen: (s: Screen) => void
}

export function NewStudyScreen({ setScreen }: NewStudyScreenProps) {
  const [step, setStep] = useState(0)
  const [fileSelected, setFileSelected] = useState(false)
  const [distance, setDistance] = useState(8.0)

  const steps = ['Upload Clip', 'Calibrate Road Plane', 'Armed Proof Gates']

  const gates = [
    ['Calibrated Road Plane', '4-point homography + 8.0m ground reference', true],
    ['Locked Timecode', '30.00 frames per second constant metadata', true],
    ['Trajectory Duration', 'Minimum 12 frames & 8m path', true],
    ['Calibrated Zone Boundary', 'Zero extrapolation outside marked polygon', true],
    ['Window Speed Consistency', 'Window spread < 15% across frames', true],
    ['Physical Bounds', 'Speed magnitude 3–200 km/h', true],
  ]

  return (
    <div className="max-w-[960px] mx-auto space-y-6">
      {/* Eyebrow & Headline */}
      <div>
        <div className="eyebrow mb-2">New Speed Study / Intake Wizard</div>
        <h2 className="display text-4xl leading-tight md:text-5xl text-[#18232a]">
          Measure your street.
          <br />
          <em className="text-[#126b6a]">Keep only what holds up.</em>
        </h2>
        <p className="mt-3 max-w-[580px] text-[13px] leading-6 text-[#627574]">
          Upload a fixed-camera street clip. StreetProof detects vehicles via Livepeer, tracks them locally, and gates every speed before committing to the public record.
        </p>
      </div>

      {/* Stepper Progress Bar */}
      <div className="flex max-w-[620px] items-center pt-3">
        {steps.map((s, i) => (
          <div key={s} className="flex flex-1 items-center">
            <div
              className={`flex items-center gap-2 text-[12px] font-semibold ${
                step >= i ? 'text-[#126b6a]' : 'text-[#9cb0ae]'
              }`}
            >
              <span
                className={`grid h-8 w-8 place-items-center rounded-full border text-[11px] font-bold ${
                  step > i
                    ? 'border-[#3bb9a3] bg-[#d9f3e9] text-[#237568]'
                    : step === i
                    ? 'border-[#1b7a74] bg-[#1b7a74] text-white shadow-md'
                    : 'border-[#d3dedd] bg-white text-[#9cb0ae]'
                }`}
              >
                {step > i ? <Check size={14} /> : i + 1}
              </span>
              <span className="hidden sm:inline">{s}</span>
            </div>
            {i < 2 && (
              <div
                className={`mx-3 h-0.5 flex-1 transition-colors ${
                  step > i ? 'bg-[#3bb9a3]' : 'bg-[#dce5e3]'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* STEP 0: Upload Clip */}
      {step === 0 && (
        <div className="grid gap-5 md:grid-cols-[1.2fr_.8fr]">
          <div className="panel rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-semibold text-[#18232a]">Add Street Video Footage</h3>
                <p className="text-[11px] text-[#718584]">MP4 or MOV · 10–60 seconds · max 250 MB</p>
              </div>
              <FileVideo size={24} className="text-[#497f77]" />
            </div>

            <button
              onClick={() => setFileSelected(true)}
              className={`group flex min-h-[260px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-all ${
                fileSelected
                  ? 'border-[#3bb9a3] bg-[#effaf5]'
                  : 'border-[#c6d7d4] bg-[#fafdfe] hover:border-[#3bb9a3] hover:bg-[#f3f9f7]'
              }`}
            >
              {fileSelected ? (
                <>
                  <span className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-[#d5f0e6] text-[#277e6c] shadow-md">
                    <Check size={26} />
                  </span>
                  <div className="text-[14px] font-bold text-[#18232a]">cedar-avenue-pass.mp4</div>
                  <div className="mt-1 text-[11px] text-[#5d7774]">18.4 MB · 00:18 duration · 30.00 fps</div>
                  <span className="mt-4 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#257c70] border border-[#b2d9d1] shadow-sm">
                    Click to replace file
                  </span>
                </>
              ) : (
                <>
                  <span className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-[#e8f2f0] text-[#277c71]">
                    <CloudUpload size={24} />
                  </span>
                  <div className="text-[14px] font-semibold text-[#18232a]">Drop street clip here</div>
                  <div className="mt-1 text-[12px] text-[#718584]">or click to browse your computer</div>
                </>
              )}
            </button>

            <div className="flex items-start gap-2 text-[11px] leading-relaxed text-[#687f7d]">
              <Info size={14} className="mt-0.5 shrink-0 text-[#369687]" />
              <span>
                Privacy safe: faces and licence plates are blurred and discarded in local RAM. Only hashes and vector metrics are published.
              </span>
            </div>
          </div>

          <div className="panel rounded-2xl p-6 space-y-4">
            <h3 className="text-[14px] font-semibold text-[#18232a]">Prerequisites for High Legal Defensibility</h3>
            <div className="space-y-3.5">
              {[
                ['Fixed camera position', 'Tripod or phone wedged completely still'],
                ['Visible road asphalt', 'Clear view of lane and pavement surface'],
                ['Known real-world distance', 'Mark 4 corner pins with tape or markings'],
                ['Consistent frame rate', 'Read automatically from video stream headers'],
              ].map(([title, desc]) => (
                <div key={title} className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[#edf5f2] text-[#2c8374]">
                    <Check size={14} />
                  </span>
                  <div>
                    <div className="text-[12px] font-semibold text-[#18232a]">{title}</div>
                    <div className="text-[11px] text-[#718584]">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: Calibrate Road */}
      {step === 1 && (
        <RoadCalibrator
          distanceMeters={distance}
          onDistanceChange={setDistance}
        />
      )}

      {/* STEP 2: Review Gates */}
      {step === 2 && (
        <div className="panel max-w-[760px] rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-[16px] font-semibold text-[#18232a]">Proof Gates Armed & Ready</h3>
              <p className="mt-1 text-[12px] text-[#637776]">
                Every vehicle must satisfy all 6 deterministic physical constraints to be entered as evidence.
              </p>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#dff3eb] text-[#277b6c] shadow-sm">
              <ShieldCheck size={22} />
            </span>
          </div>

          <div className="divide-y divide-[#e9efed]">
            {gates.map(([title, detail]) => (
              <div key={title as string} className="flex items-center justify-between py-3.5">
                <div className="flex items-center gap-3">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-[#def3e9] text-[#237c6b]">
                    <Check size={13} />
                  </span>
                  <div>
                    <div className="text-[12px] font-semibold text-[#18232a]">{title as string}</div>
                    <div className="text-[11px] text-[#728685]">{detail as string}</div>
                  </div>
                </div>
                <span className="mono text-[10px] font-bold uppercase tracking-wider text-[#2d7f70]">
                  Armed
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-[#e6edeb] pt-5">
            <div className="flex items-center gap-2 text-[11px] text-[#687d7b]">
              <Zap size={14} className="text-[#d18436]" />
              <span>Estimated 30 Livepeer YOLO batches · ~$0.03 USD</span>
            </div>
            <button
              onClick={() => setScreen('processing')}
              className="btn btn-dark shadow-md"
            >
              <span>Execute Speed Study</span>
              <Play size={13} fill="currentColor" />
            </button>
          </div>
        </div>
      )}

      {/* Stepper Navigation Buttons */}
      <div className="flex justify-between pt-4">
        {step > 0 ? (
          <button onClick={() => setStep(step - 1)} className="btn btn-light">
            <ArrowLeft size={14} /> Back
          </button>
        ) : <div />}

        {step === 0 && (
          <button
            onClick={() => fileSelected && setStep(1)}
            disabled={!fileSelected}
            className={`btn ${
              fileSelected
                ? 'btn-dark'
                : 'cursor-not-allowed bg-[#dce5e3] text-[#8e9c9b]'
            }`}
          >
            Continue to Calibration <ArrowRight size={14} />
          </button>
        )}

        {step === 1 && (
          <button onClick={() => setStep(2)} className="btn btn-dark">
            Review Armed Gates <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
