import assert from "node:assert/strict"
import { test } from "node:test"
import { animateWhenVisible } from "../features/overview/motion.ts"

function createEnvironment(t, { reduced = false, inView = true } = {}) {
  const document = new EventTarget()
  document.hidden = false
  const preference = new EventTarget()
  preference.matches = reduced
  let intersection
  let visible = inView
  let created = 0
  let killed = 0
  let settled = 0
  let completed
  let disconnected = 0

  class Observer {
    constructor(callback) {
      intersection = callback
    }
    observe() {}
    disconnect() {
      disconnected++
    }
  }
  const globals = {
    document,
    window: {
      innerHeight: 800,
      IntersectionObserver: Observer,
      matchMedia() {
        return preference
      },
    },
    IntersectionObserver: Observer,
  }
  for (const [key, value] of Object.entries(globals)) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key)
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    })
    t.after(() => {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    })
  }
  const cancel = animateWhenVisible(
    {
      getBoundingClientRect() {
        return visible ? { top: 100, bottom: 200 } : { top: 900, bottom: 1000 }
      },
    },
    () => {
      created++
      return {
        kill() {
          killed++
        },
        eventCallback(name, callback) {
          if (name === "onComplete") completed = callback
        },
      }
    },
    () => {
      settled++
    }
  )

  return {
    cancel,
    counts() {
      return { created, killed, settled, disconnected }
    },
    intersect(next) {
      visible = next
      intersection?.([{ isIntersecting: next }])
    },
    hide() {
      document.hidden = true
      document.dispatchEvent(new Event("visibilitychange"))
    },
    reduce() {
      preference.matches = true
      preference.dispatchEvent(new Event("change"))
    },
    complete() {
      completed?.()
    },
  }
}

test("reduced motion presents the final value without creating an animation", (t) => {
  const env = createEnvironment(t, { reduced: true })
  assert.equal(env.counts().created, 0)
  assert.equal(env.counts().settled, 1)
  env.cancel()
})

test("offscreen entrance waits for visibility, runs once, and settles on leaving", (t) => {
  const env = createEnvironment(t, { inView: false })
  assert.equal(env.counts().created, 0)
  env.intersect(true)
  env.intersect(true)
  assert.equal(env.counts().created, 1)
  env.intersect(false)
  assert.equal(env.counts().settled, 1)
  assert.equal(env.counts().killed, 1)
  env.intersect(true)
  env.complete()
  assert.equal(env.counts().created, 1)
  assert.equal(env.counts().settled, 1)
  env.cancel()
})

test("enabling reduced motion mid-transition settles once and removes listeners", (t) => {
  const env = createEnvironment(t)
  assert.equal(env.counts().created, 1)
  env.reduce()
  env.reduce()
  env.hide()
  assert.equal(env.counts().settled, 1)
  assert.equal(env.counts().disconnected, 1)
  env.cancel()
})

test("hidden pages settle active animations; unmounted deferred animations never start", (t) => {
  const env = createEnvironment(t)
  env.hide()
  assert.equal(env.counts().settled, 1)
  env.cancel()
})

test("unmount cancels observers without applying a stale completion", (t) => {
  const env = createEnvironment(t, { inView: false })
  env.cancel()
  env.intersect(true)
  env.reduce()
  assert.equal(env.counts().created, 0)
  assert.equal(env.counts().settled, 0)
})
