"use client"

import { useLayoutEffect, useRef } from "react"
import { gsap } from "gsap"
import { formatMoney } from "./overview-model"
import { animateWhenVisible, motion, useReducedMotion } from "./motion"

type AnimatedNumberProps = {
  value: number
  entrance?: boolean
  duration?: number
}

export function AnimatedNumber({
  value,
  entrance = true,
  duration = motion.change,
}: AnimatedNumberProps) {
  const visualRef = useRef<HTMLSpanElement>(null)
  const current = useRef(value)
  const entered = useRef(false)
  const reducedMotion = useReducedMotion()
  const formatted = formatMoney(value)

  useLayoutEffect(() => {
    const element = visualRef.current
    if (!element || reducedMotion === null) return

    function settle() {
      current.current = value
      entered.current = true
      if (element) element.textContent = formatMoney(value)
    }

    if (reducedMotion) {
      settle()
      return
    }

    return animateWhenVisible(
      element,
      () => {
        const initial = !entered.current && entrance
        const amount = { value: initial ? 0 : current.current }
        element.textContent = formatMoney(amount.value)
        return gsap.to(amount, {
          value,
          duration: initial ? motion.entrance : duration,
          ease: motion.ease,
          onStart() {
            entered.current = true
          },
          onUpdate() {
            current.current = amount.value
            element.textContent = formatMoney(amount.value)
          },
        })
      },
      settle
    )
  }, [value, entrance, duration, reducedMotion])

  return (
    <span className="animated-number">
      <span className="animated-number-reserve" aria-hidden="true">
        {formatted}
      </span>
      <span
        className="animated-number-visual"
        aria-hidden="true"
        ref={visualRef}
      >
        {formatted}
      </span>
      <span className="sr-only">{formatted}</span>
    </span>
  )
}
