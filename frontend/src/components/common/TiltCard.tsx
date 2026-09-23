import React, { useRef, useState } from 'react'
import { motion } from 'framer-motion'

interface TiltCardProps {
  children: React.ReactNode
  className?: string
  glareColor?: string
  maxTilt?: number
  onClick?: () => void
}

export function TiltCard({
  children,
  className = '',
  glareColor = 'rgba(255, 255, 255, 0.4)',
  maxTilt = 12,
  onClick,
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50, opacity: 0 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const rotateX = ((y - centerY) / centerY) * -maxTilt
    const rotateY = ((x - centerX) / centerX) * maxTilt

    const glareX = (x / rect.width) * 100
    const glareY = (y / rect.height) * 100

    setTilt({ rotateX, rotateY, glareX, glareY, opacity: 1 })
  }

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50, opacity: 0 })
  }

  return (
    <div style={{ perspective: 1000 }} className="inline-block w-full">
      <motion.div
        ref={cardRef}
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        animate={{
          rotateX: tilt.rotateX,
          rotateY: tilt.rotateY,
          scale: tilt.opacity ? 1.015 : 1,
        }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        style={{ transformStyle: 'preserve-3d' }}
        className={`relative overflow-hidden rounded-2xl border border-[#dce5e3] bg-white/80 p-6 shadow-[0_16px_40px_rgba(23,50,48,0.06)] backdrop-blur-md transition-shadow hover:shadow-[0_24px_55px_rgba(23,50,48,0.12)] ${className}`}
      >
        {/* Holographic / Specular glare reflection */}
        <div
          className="pointer-events-none absolute -inset-full transition-opacity duration-300"
          style={{
            opacity: tilt.opacity * 0.7,
            background: `radial-gradient(circle 350px at ${tilt.glareX}% ${tilt.glareY}%, ${glareColor}, transparent 70%)`,
          }}
        />

        {/* Content with 3D elevation */}
        <div style={{ transform: 'translateZ(24px)' }} className="relative z-10">
          {children}
        </div>
      </motion.div>
    </div>
  )
}
