import type { TrendPoint } from "./overview-model"

export const plotWidth = 1000
export const plotHeight = 160

type PlotPoint = { x: number; y: number }
export type TrendGeometry = {
  min: number
  max: number
  points: readonly PlotPoint[]
}

export function createTrendGeometry(
  points: readonly TrendPoint[]
): TrendGeometry {
  const values = points.map((point) => point.value)
  const dataMin = values.length
    ? Math.floor(Math.min(...values) / 40_000) * 40_000
    : 0
  const max = values.length
    ? Math.ceil(Math.max(...values) / 40_000) * 40_000 + 40_000
    : 40_000
  const span = max - dataMin || 1
  return {
    min: dataMin,
    max,
    points: points.map((point, index) => ({
      x: (index / Math.max(1, points.length - 1)) * plotWidth,
      y: plotHeight - ((point.value - dataMin) / span) * plotHeight,
    })),
  }
}

export function trendPath(geometry: TrendGeometry) {
  return geometry.points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${point.x.toFixed(3)},${point.y.toFixed(3)}`
    )
    .join(" ")
}

function sampleAt(points: readonly PlotPoint[], positions: readonly number[]) {
  let index = 0
  return positions.map((x) => {
    while (index < points.length - 2 && (points[index + 1]?.x ?? 0) < x) index++
    const from = points[index]
    const to = points[index + 1] ?? from
    if (!from || !to) return plotHeight
    const progress = Math.min(
      1,
      Math.max(0, (x - from.x) / (to.x - from.x || 1))
    )
    return from.y + (to.y - from.y) * progress
  })
}

// Union the original vertices instead of dropping peaks or inventing new data.
// A new transition can start from the currently displayed intermediate geometry.
export function createTrendInterpolator(
  from: TrendGeometry,
  to: TrendGeometry
) {
  const positions = [
    ...new Set([...from.points, ...to.points].map((point) => point.x)),
  ].sort((a, b) => a - b)
  const start = sampleAt(from.points, positions)
  const end = sampleAt(to.points, positions)

  return function interpolate(progress: number): TrendGeometry {
    if (progress <= 0) return from
    if (progress >= 1) return to
    return {
      min: from.min + (to.min - from.min) * progress,
      max: from.max + (to.max - from.max) * progress,
      points: positions.map((x, index) => {
        const y = start[index] ?? plotHeight
        return { x, y: y + ((end[index] ?? y) - y) * progress }
      }),
    }
  }
}
