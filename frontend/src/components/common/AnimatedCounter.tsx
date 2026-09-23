import { useEffect, useState } from 'react'

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

  useEffect(() => {
    let startTime: number | null = null
    const startValue = displayValue

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      const current = startValue + (numericValue - startValue) * easeProgress
      setDisplayValue(current)

      if (progress < 1) {
        requestAnimationFrame(step)
      }
    }

    const frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [numericValue, duration])

  return (
    <span className={className}>
      {prefix}
      {displayValue.toFixed(decimals)}
      {suffix}
    </span>
  )
}
