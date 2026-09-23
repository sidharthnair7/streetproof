export type Screen = 'landing' | 'overview' | 'new-study' | 'processing' | 'results' | 'verifier'

export interface Study {
  id: string
  street: string
  date: string
  vehicles: string
  proven: string
  p85: string
  status: 'Verified' | 'Processing' | 'Draft'
  speedLimitKmh: number
  ual?: string
  videoHash?: string
}

export interface CalibrationPoint {
  id: number
  x: number // percentage 0 - 100
  y: number // percentage 0 - 100
  label: string
}

export interface VehicleDetection {
  id: string
  speedKmh: number
  confidence: number
  status: 'proven' | 'refused'
  refusalReason?: 'track_too_short' | 'out_of_zone' | 'variance_high' | 'physics_implausible'
  refusalDetail?: string
  trajectory: {
    frame: number
    x: number // percent 0-100
    y: number // percent 0-100
    w: number // px
    h: number // px
    speed: number
  }[]
}

export interface GateRule {
  id: string
  title: string
  subtitle: string
  threshold: string
  status: 'armed' | 'passed' | 'refused'
  testedCount: number
  passedCount: number
}

export interface TelemetryLog {
  id: string
  timestamp: string
  frame: number
  source: 'livepeer' | 'kalman' | 'gate' | 'dkg'
  message: string
  level: 'info' | 'success' | 'warn'
}
