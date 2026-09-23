import React, { useRef, useState } from 'react'

interface BentoCardProps {
  children: React.ReactNode
  className?: string
  glowColor?: string
  onClick?: () => void
}

export function BentoCard({
  children,
  className = '',
  glowColor = 'rgba(156, 227, 210, 0.35)',
  onClick,
}: BentoCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState<{ x: number; y: number; opacity: number }>({
    x: 0,
    y: 0,
    opacity: 0,
  })

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      opacity: 1,
    })
  }

  const handlePointerLeave = () => {
    setCoords((prev) => ({ ...prev, opacity: 0 }))
  }

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`group relative overflow-hidden rounded-2xl border border-[#dce5e3] bg-white/75 p-5 shadow-[0_12px_35px_rgba(23,50,48,0.035)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-[#a8dcd1] hover:shadow-[0_20px_45px_rgba(23,50,48,0.08)] ${className}`}
    >
      {/* Dynamic Cursor Proximity Border Glow */}
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl transition-opacity duration-300"
        style={{
          opacity: coords.opacity,
          background: `radial-gradient(400px circle at ${coords.x}px ${coords.y}px, ${glowColor}, transparent 80%)`,
        }}
      />
      {/* Inner card surface */}
      <div className="relative z-10">{children}</div>
    </div>
  )
}
