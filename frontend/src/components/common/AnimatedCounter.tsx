import { useEffect, useRef, useState } from 'react'

interface AnimatedCounterProps {
  value: number | string
  decimals?: number
  prefix?: string
  suffix?: string
  duration?: number
  className?: string
}

export function AnimatedCounter({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  duration = 900,
  className = '',
}: AnimatedCounterProps) {
  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.]/g, '')) || 0 : value
  const [displayValue, setDisplayValue] = useState(0)
  const shown = useRef(0)

  useEffect(() => {
    let frame = 0
    let startTime: number | null = null
    const startValue = shown.current

    const step = (timestamp: number) => {
      if (startTime === null) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      shown.current = startValue + (numericValue - startValue) * eased
      setDisplayValue(shown.current)
      if (progress < 1) frame = requestAnimationFrame(step)
    }

    frame = requestAnimationFrame(step)
    const settle = window.setTimeout(() => {
      cancelAnimationFrame(frame)
      shown.current = numericValue
      setDisplayValue(numericValue)
    }, duration + 80)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(settle)
    }
  }, [numericValue, duration])

  return (
    <span className={className}>
      {prefix}
      {displayValue.toFixed(decimals)}
      {suffix}
    </span>
  )
}
