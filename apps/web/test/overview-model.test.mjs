import assert from "node:assert/strict"
import { test } from "node:test"
import {
  exampleHoldings,
  exampleTrend,
  filterHoldings,
  formatMoney,
  selectTrendRange,
} from "../features/overview/overview-model.ts"

test("wallet filtering keeps the original holdings and allows returning to all wallets", () => {
  const original = [...exampleHoldings]
  const flexible = filterHoldings(exampleHoldings, "flexible")
  assert.deepEqual(
    flexible.map((holding) => holding.id),
    ["haichuan"]
  )
  const longTerm = filterHoldings(exampleHoldings, "long-term")
  assert.equal(longTerm.length, 3)
  assert.ok(longTerm.every((holding) => holding.walletId === "long-term"))
  assert.deepEqual(filterHoldings(exampleHoldings, "all"), original)
  assert.deepEqual(exampleHoldings, original)
  assert.deepEqual(filterHoldings([], "long-term"), [])
})

test("trend ranges cover calendar months and retain the same final valuation", () => {
  const expectedStarts = {
    "1m": "2026-05-01",
    "3m": "2026-03-01",
    "6m": "2025-12-01",
    "1y": "2025-06-01",
    all: "2024-06-01",
  }
  for (const [range, start] of Object.entries(expectedStarts)) {
    const selected = selectTrendRange(exampleTrend, range)
    assert.equal(selected[0].date, start)
    assert.deepEqual(selected.at(-1), { date: "2026-05-31", value: 200_000 })
    assert.ok(selected.every((point) => point.date >= start))
  }
  assert.deepEqual(
    selectTrendRange(exampleTrend, "3m").filter(
      (point) => point.date >= "2026-05-01"
    ),
    selectTrendRange(exampleTrend, "1m")
  )
})

test("trend selection handles empty, sparse and leap-year data without local timezone shifts", () => {
  assert.deepEqual(selectTrendRange([], "3m"), [])
  const points = [
    { date: "2023-11-30", value: 1 },
    { date: "2023-12-01", value: 2 },
    { date: "2024-02-29", value: 3 },
  ]
  assert.deepEqual(selectTrendRange(points, "3m"), points.slice(1))
  assert.deepEqual(selectTrendRange(points, "1m"), points.slice(2))
  assert.deepEqual(selectTrendRange(points, "all"), points)
})

test("amounts retain currency, grouping and two decimal places", () => {
  assert.equal(formatMoney(200000), "¥200,000.00")
  assert.equal(formatMoney(58.8), "¥58.80")
  assert.equal(formatMoney(0), "¥0.00")
})
