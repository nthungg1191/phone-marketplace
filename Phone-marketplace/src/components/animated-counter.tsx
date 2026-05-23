"use client"

import * as React from "react"

interface AnimatedCounterProps {
  value: string
  duration?: number
  scrambleDuration?: number
}

function parseValue(value: string): { prefix: string; number: number; suffix: string } {
  const match = value.match(/^([^0-9]*)([0-9,.]+)(.*)$/)
  if (!match) return { prefix: "", number: 0, suffix: value }

  const prefix = match[1]
  const numStr = match[2].replace(/,/g, "")
  const suffix = match[3]

  const number = parseFloat(numStr) || 0

  return { prefix, number, suffix }
}

function scrambleNearTarget(baseValue: number, progress: number, maxRandom: number): number {
  const minVal = Math.max(0, baseValue * (1 - maxRandom))
  const maxVal = baseValue * (1 + maxRandom)

  const narrowingFactor = Math.pow(1 - progress, 2)
  const randomRange = narrowingFactor * maxRandom * baseValue

  const randomOffset = (Math.random() - 0.5) * 2 * randomRange
  const currentValue = baseValue * progress + randomOffset

  return Math.max(0, currentValue)
}

export function AnimatedCounter({ value, duration = 2000, scrambleDuration = 1000 }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = React.useState(value)
  const [isAnimating, setIsAnimating] = React.useState(false)
  const ref = React.useRef<HTMLSpanElement>(null)
  const hasAnimated = React.useRef(false)

  const { prefix, number, suffix } = parseValue(value)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true
            setIsAnimating(true)
          }
        })
      },
      { threshold: 0.5 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  React.useEffect(() => {
    if (!isAnimating) return

    const steps = 30
    const stepDuration = scrambleDuration / steps

    let step = 0
    const scrambleInterval = setInterval(() => {
      if (step < steps) {
        const progress = (step + 1) / steps
        const maxRandom = 0.8

        const currentValue = scrambleNearTarget(number, progress, maxRandom)

        if (progress > 0.85) {
          setDisplayValue(value)
        } else {
          setDisplayValue(`${prefix}${formatNumber(currentValue)}${suffix}`)
        }
        step++
      } else {
        clearInterval(scrambleInterval)
        setDisplayValue(value)
      }
    }, stepDuration)

    return () => clearInterval(scrambleInterval)
  }, [isAnimating, number, prefix, suffix, value, scrambleDuration])

  return (
    <span ref={ref} className="inline-block tabular-nums">
      {displayValue}
    </span>
  )
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return num.toLocaleString("en-US", { maximumFractionDigits: 0 })
  }
  if (num % 1 !== 0) {
    return num.toFixed(1)
  }
  return Math.round(num).toLocaleString("en-US")
}
