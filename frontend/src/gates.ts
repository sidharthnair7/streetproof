export interface GateDef {
  code: string
  title: string
  rule: string
  why: string
}

export const GATES: GateDef[] = [
  { code: 'NO_CALIBRATION', title: 'Known distance', rule: 'curb marks, car length, or a calibration loaded from the DKG', why: 'No calibration, no speed.' },
  { code: 'NO_FRAME_RATE', title: 'Known time', rule: 'frame rate read from the video', why: 'No reliable time between frames, no speed.' },
  { code: 'TOO_FEW_CLEAN_FRAMES', title: 'Enough clean frames', rule: 'at least 6 frames with the whole car in view', why: 'A car clipped by the frame edge is refused.' },
  { code: 'UNSTEADY_MOTION', title: 'Steady straight-line fit', rule: 'R² ≥ 0.98 side-on, ≥ 0.95 head-on', why: 'Braking, occlusion or a tracking switch is refused.' },
  { code: 'UNSTABLE_BOX', title: 'Stable box', rule: 'box size varies by at most 15%', why: 'Two cars merged into one box is refused.' },
  { code: 'LOW_CONFIDENCE', title: 'Confident detection', rule: 'median detector confidence ≥ 0.5', why: 'A shaky detection never becomes a number.' },
  { code: 'IMPLAUSIBLE_SPEED', title: 'Plausible speed', rule: '3 to 200 km/h', why: 'Physics gets the final word.' },
]

export const REASON_TEXT: Record<string, string> = Object.fromEntries(GATES.map((g) => [g.code, g.title]))
