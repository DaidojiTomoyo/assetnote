import assert from "node:assert/strict"
import { test } from "node:test"
import { placeTrendTooltip } from "../features/overview/trend-tooltip.ts"

const tooltip = { width: 192, height: 96 }

test("inspection stays beside its point and flips before the right edge", () => {
  const plot = { width: 1228, height: 148 }
  const left = placeTrendTooltip({ x: 0, y: 74 }, plot, tooltip)
  const right = placeTrendTooltip({ x: 1228, y: 74 }, plot, tooltip)
  assert.ok(left.x > 0)
  assert.ok(right.x + tooltip.width < 1228)
  assert.equal(left.y, right.y)
})

test("all chart positions keep the readout inside desktop and mobile plots", () => {
  for (const plot of [
    { width: 1228, height: 148 },
    { width: 287, height: 180 },
    { width: 192, height: 180 },
  ]) {
    for (let x = 0; x <= plot.width; x += plot.width / 20) {
      for (let y = 0; y <= plot.height; y += plot.height / 20) {
        const position = placeTrendTooltip({ x, y }, plot, tooltip)
        assert.ok(position.x >= 0 && position.y >= 0)
        assert.ok(position.x + tooltip.width <= plot.width)
        assert.ok(position.y + tooltip.height <= plot.height)
      }
    }
  }
})

test("narrow plots place the tooltip above or below the marker when possible", () => {
  const plot = { width: 287, height: 180 }
  const above = placeTrendTooltip({ x: 143, y: 160 }, plot, tooltip)
  const below = placeTrendTooltip({ x: 143, y: 20 }, plot, tooltip)
  assert.ok(above.y + tooltip.height < 160)
  assert.ok(below.y > 20)
})
