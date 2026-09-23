import { useState } from 'react'
import { Screen } from '../types/study'
import { PipelineBeams } from '../components/pipeline/PipelineBeams'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

interface ProcessingScreenProps {
  setScreen: (s: Screen) => void
}

export function ProcessingScreen({ setScreen }: ProcessingScreenProps) {
  const [completed, setCompleted] = useState(false)

  return (
    <div className="max-w-[940px] mx-auto space-y-7">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-2">SP-2409-022 / LIVE INFERENCE RUN</div>
          <h2 className="display text-4xl leading-tight md:text-5xl text-[#18232a]">
            Reading the street.
            <br />
            <em className="text-[#126b6a]">Refusing weak numbers.</em>
          </h2>
        </div>

        {completed && (
          <div className="flex items-center gap-2 rounded-xl bg-[#d9f3e9] px-4 py-2 text-[12px] font-bold text-[#1f7365] shadow-sm">
            <CheckCircle2 size={16} /> Inference & Gating Complete
          </div>
        )}
      </div>

      {/* Magic UI Multi-Node Animated Pipeline & Live Terminal */}
      <PipelineBeams
        onComplete={() => setCompleted(true)}
      />

      {/* Completion CTA */}
      <div className="flex justify-end pt-4">
        <button
          onClick={() => setScreen('results')}
          className={`btn ${
            completed ? 'btn-dark scale-105 shadow-xl' : 'btn-light'
          } transition-all`}
        >
          <span>Open Full Study Results & Evidence</span>
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  )
}
