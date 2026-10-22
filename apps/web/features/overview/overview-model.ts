export type WalletId = "long-term" | "flexible"
export type WalletFilter = WalletId | "all"
export type TrendRange = "1m" | "3m" | "6m" | "1y" | "all"

export type ExampleHolding = {
  id: string
  name: string
  walletId: WalletId
  value: number
}

export type TrendPoint = { date: string; value: number }

// Presentation fixtures only. These are not an API response or a user's assets.
export const examplePortfolio = {
  total: 200_000,
  stocks: 180_000,
  cash: 20_000,
  wallets: [
    { id: "long-term", name: "长期持有", value: 142_000 },
    { id: "flexible", name: "灵活配置", value: 58_000 },
  ],
} satisfies {
  total: number
  stocks: number
  cash: number
  wallets: { id: WalletId; name: string; value: number }[]
}

export const exampleHoldings: readonly ExampleHolding[] = [
  { id: "qinghe", name: "青禾科技", walletId: "long-term", value: 58_800 },
  { id: "yuanshan", name: "远山消费", walletId: "long-term", value: 46_800 },
  { id: "haichuan", name: "海川制造", walletId: "flexible", value: 43_200 },
  { id: "chenguang", name: "晨光能源", walletId: "long-term", value: 31_200 },
]

export const trendRanges: readonly { id: TrendRange; label: string }[] = [
  { id: "1m", label: "1个月" },
  { id: "3m", label: "3个月" },
  { id: "6m", label: "6个月" },
  { id: "1y", label: "1年" },
  { id: "all", label: "全部" },
]

const moneyFormatter = new Intl.NumberFormat("zh-CN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatMoney(value: number) {
  return `¥${moneyFormatter.format(value)}`
}

export function getWalletName(id: WalletId) {
  return examplePortfolio.wallets.find((wallet) => wallet.id === id)?.name ?? ""
}

export function filterHoldings(
  holdings: readonly ExampleHolding[],
  wallet: WalletFilter
) {
  return holdings.filter(
    (holding) => wallet === "all" || holding.walletId === wallet
  )
}

function createExampleTrend(): readonly TrendPoint[] {
  const start = Date.UTC(2024, 5, 1)
  const end = Date.UTC(2026, 4, 31)
  const finalQuarter = Date.UTC(2026, 2, 1)
  const day = 86_400_000
  const values = [
    100_000, 113_000, 110_000, 121_000, 125_000, 123_000, 132_000, 128_000,
    119_000, 117_000, 126_000, 119_000, 124_000, 138_000, 130_000, 144_000,
    138_000, 148_000, 156_000, 153_000, 169_000, 164_000, 169_000, 166_000,
    171_000, 162_000, 166_000, 178_000, 184_000, 197_000, 190_000, 195_000,
    200_000,
  ]
  const points: TrendPoint[] = []

  for (let time = start; time <= end; time += day) {
    let value: number
    if (time < finalQuarter) {
      const progress = (time - start) / (finalQuarter - start)
      value = 52_000 + progress * 48_000 + Math.sin(progress * 28) * 5_000
    } else {
      const position =
        ((time - finalQuarter) / (end - finalQuarter)) * (values.length - 1)
      const index = Math.floor(position)
      const from = values[index] ?? 200_000
      const to = values[index + 1] ?? from
      value = from + (to - from) * (position - index)
    }
    points.push({
      date: new Date(time).toISOString().slice(0, 10),
      value: Math.round(value),
    })
  }
  return points
}

export const exampleTrend = createExampleTrend()

export function selectTrendRange(
  points: readonly TrendPoint[],
  range: TrendRange
) {
  const last = points.at(-1)
  if (!last || range === "all") return [...points]

  const months = { "1m": 1, "3m": 3, "6m": 6, "1y": 12 }[range]
  const end = new Date(`${last.date}T00:00:00Z`)
  const start = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - months + 1, 1)
  )
    .toISOString()
    .slice(0, 10)
  return points.filter((point) => point.date >= start)
}
