import assert from "node:assert/strict"
import { test } from "node:test"
import {
  exampleTrend,
  selectTrendRange,
} from "../features/overview/overview-model.ts"
import {
  createTrendGeometry,
  createTrendInterpolator,
  plotHeight,
  plotWidth,
  trendPath,
} from "../features/overview/trend-geometry.ts"

test("chart geometry retains every source vertex and the original axis domain", () => {
  for (const range of ["1m", "3m", "6m", "1y", "all"]) {
    const source = selectTrendRange(exampleTrend, range)
    const geometry = createTrendGeometry(source)
    assert.equal(geometry.points.length, source.length)
    assert.equal(geometry.points[0].x, 0)
    assert.equal(geometry.points.at(-1).x, plotWidth)
    source.forEach((point, index) => {
      const restored =
        geometry.min +
        (1 - geometry.points[index].y / plotHeight) *
          (geometry.max - geometry.min)
      assert.ok(Math.abs(restored - point.value) < 0.000001)
    })
    assert.ok(!/NaN|Infinity/.test(trendPath(geometry)))
  }
})

test("morphing different ranges preserves endpoints and the union of their peaks", () => {
  const from = createTrendGeometry(selectTrendRange(exampleTrend, "1m"))
  const to = createTrendGeometry(selectTrendRange(exampleTrend, "all"))
  const interpolate = createTrendInterpolator(from, to)
  assert.strictEqual(interpolate(0), from)
  assert.strictEqual(interpolate(1), to)
  const middle = interpolate(0.5)
  const positions = new Set(middle.points.map((point) => point.x))
  for (const point of [...from.points, ...to.points])
    assert.ok(positions.has(point.x))
  assert.equal(middle.min, (from.min + to.min) / 2)
  assert.equal(middle.max, (from.max + to.max) / 2)
  assert.ok(middle.points.every((point) => Number.isFinite(point.y)))
})

test("rapid range changes resume from the visible curve and end at the latest selection", () => {
  let visible = createTrendGeometry(selectTrendRange(exampleTrend, "3m"))
  for (const range of ["all", "1m", "6m", "1y", "1m"]) {
    const target = createTrendGeometry(selectTrendRange(exampleTrend, range))
    const interpolate = createTrendInterpolator(visible, target)
    assert.strictEqual(interpolate(0), visible)
    visible = interpolate(0.34)
    assert.ok(!/NaN|Infinity/.test(trendPath(visible)))
    assert.strictEqual(interpolate(1), target)
  }
  const final = createTrendGeometry(selectTrendRange(exampleTrend, "1m"))
  assert.deepEqual(createTrendInterpolator(visible, final)(1), final)
})

test("empty, single-value and flat series remain finite", () => {
  for (const points of [
    [],
    [{ date: "2026-01-01", value: 0 }],
    [
      { date: "2026-01-01", value: -10 },
      { date: "2026-01-02", value: -10 },
    ],
  ]) {
    const geometry = createTrendGeometry(points)
    assert.ok(geometry.max > geometry.min)
    assert.ok(!/NaN|Infinity/.test(trendPath(geometry)))
    assert.deepEqual(createTrendInterpolator(geometry, geometry)(1), geometry)
  }
})
