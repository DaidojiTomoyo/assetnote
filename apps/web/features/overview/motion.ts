import { useSyncExternalStore } from "react"
import { gsap } from "gsap"

export const motion = {
  ease: "expo.out",
  entrance: 0.72,
  change: 0.42,
  feedback: 0.18,
} as const

const reducedMotionQuery = "(prefers-reduced-motion: reduce)"

function subscribeToMotionPreference(notify: () => void) {
  const query = window.matchMedia(reducedMotionQuery)
  query.addEventListener("change", notify)
  return () => query.removeEventListener("change", notify)
}

function getMotionPreference() {
  return window.matchMedia(reducedMotionQuery).matches
}

function getServerMotionPreference(): boolean | null {
  return null
}

export function useReducedMotion() {
  return useSyncExternalStore(
    subscribeToMotionPreference,
    getMotionPreference,
    getServerMotionPreference
  )
}

// Bounded animations start in view and settle if the user leaves the page/region.
// The unenhanced DOM always contains the final, readable state.
export function animateWhenVisible(
  element: Element,
  createAnimation: () => gsap.core.Animation,
  settle: () => void
) {
  const preference = window.matchMedia(reducedMotionQuery)
  if (preference.matches) {
    settle()
    return () => {}
  }
  let animation: gsap.core.Animation | undefined
  let started = false
  let disposed = false
  let observer: IntersectionObserver | undefined

  function stopObserving() {
    disposed = true
    observer?.disconnect()
    document.removeEventListener("visibilitychange", onVisibilityChange)
    preference.removeEventListener("change", onMotionPreferenceChange)
  }

  function finish() {
    if (disposed) return
    animation?.kill()
    settle()
    stopObserving()
  }

  function start() {
    if (started || disposed || document.hidden) return
    started = true
    animation = createAnimation()
    animation.eventCallback("onComplete", finish)
  }

  function onVisibilityChange() {
    if (document.hidden && started) finish()
    else if (!document.hidden) checkVisibility()
  }

  function onMotionPreferenceChange() {
    if (preference.matches) finish()
  }

  function checkVisibility() {
    const bounds = element.getBoundingClientRect()
    if (bounds.bottom > 0 && bounds.top < window.innerHeight) start()
  }

  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) start()
      else if (started) finish()
    })
    observer.observe(element)
  }
  document.addEventListener("visibilitychange", onVisibilityChange)
  preference.addEventListener("change", onMotionPreferenceChange)
  checkVisibility()
  if (!observer && !started) finish()

  return () => {
    animation?.kill()
    stopObserving()
  }
}
