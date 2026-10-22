type Point = { x: number; y: number }
type Size = { width: number; height: number }

export function placeTrendTooltip(point: Point, plot: Size, tooltip: Size) {
  const gap = 16
  const inset = 8
  const maxX = Math.max(0, plot.width - tooltip.width)
  const maxY = Math.max(0, plot.height - tooltip.height)
  const fitsRight = point.x + gap + tooltip.width <= plot.width - inset
  const fitsLeft = point.x - gap - tooltip.width >= inset
  let x = point.x + gap
  let y = point.y - tooltip.height / 2

  if (!fitsRight && fitsLeft) x = point.x - gap - tooltip.width
  if (!fitsRight && !fitsLeft) {
    x = point.x - tooltip.width / 2
    // On narrow plots, use the larger space above or below the selected point.
    y =
      point.y >= plot.height / 2
        ? point.y - gap - tooltip.height
        : point.y + gap
  }

  return {
    x: Math.min(Math.max(Math.min(inset, maxX), x), maxX),
    y: Math.min(Math.max(Math.min(inset, maxY), y), maxY),
  }
}
