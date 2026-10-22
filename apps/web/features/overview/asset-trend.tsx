"use client"

import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react"
import { gsap } from "gsap"
import { animateWhenVisible, motion, useReducedMotion } from "./motion"
import { placeTrendTooltip } from "./trend-tooltip"
import {
  createTrendGeometry,
  createTrendInterpolator,
  plotHeight,
  plotWidth,
  trendPath,
  type TrendGeometry,
} from "./trend-geometry"
import {
  exampleTrend,
  formatMoney,
  selectTrendRange,
  trendRanges,
  type TrendRange,
} from "./overview-model"

export function AssetTrend() {
  const titleId = useId()
  const descriptionId = useId()
  const [range, setRange] = useState<TrendRange>("3m")
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const reducedMotion = useReducedMotion()
  const points = useMemo(() => selectTrendRange(exampleTrend, range), [range])
  const geometry = useMemo(() => createTrendGeometry(points), [points])
  const currentGeometry = useRef(geometry)
  const entered = useRef(false)
  const plotRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<SVGPathElement>(null)
  const areaRef = useRef<SVGPathElement>(null)
  const clipRef = useRef<SVGRectElement>(null)
  const axisRef = useRef<HTMLDivElement>(null)
  const rangesRef = useRef<HTMLDivElement>(null)
  const highlightRef = useRef<HTMLSpanElement>(null)
  const highlightReady = useRef(false)
  const cursorRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLOutputElement>(null)
  const moveInspection = useRef<
    ((point: { x: number; y: number } | null) => void) | null
  >(null)
  const finishMorph = useRef<(() => void) | null>(null)
  const clipId = useId()
  const first = points[0]
  const last = points.at(-1)
  const selected = activeIndex === null ? null : points[activeIndex]
  const { min, max } = geometry
  const span = max - min || 1
  const line = useMemo(() => trendPath(geometry), [geometry])
  const dateLabels = useMemo(
    () =>
      Array.from(
        { length: 7 },
        (_, index) =>
          points[Math.round((index / 6) * (points.length - 1))]?.date ?? ""
      ),
    [points]
  )

  useLayoutEffect(() => {
    const plot = plotRef.current
    const clip = clipRef.current
    const axes = axisRef.current?.querySelectorAll("span")
    if (!plot || reducedMotion === null) return

    function render(next: TrendGeometry) {
      currentGeometry.current = next
      const path = trendPath(next)
      lineRef.current?.setAttribute("d", path)
      areaRef.current?.setAttribute(
        "d",
        `${path} L${plotWidth},${plotHeight} L0,${plotHeight} Z`
      )
      axes?.forEach((label, index) => {
        label.textContent = Math.round(
          next.max - (index / 4) * (next.max - next.min)
        ).toLocaleString("zh-CN")
      })
    }

    function settle() {
      entered.current = true
      render(geometry)
      clip?.setAttribute("width", String(plotWidth + 4))
      finishMorph.current = null
    }

    if (reducedMotion) {
      settle()
      return
    }

    const cancel = animateWhenVisible(
      plot,
      () => {
        if (!entered.current && currentGeometry.current === geometry) {
          render(geometry)
          return gsap.fromTo(
            clip,
            { attr: { width: 0 } },
            {
              attr: { width: plotWidth + 4 },
              duration: motion.entrance,
              ease: motion.ease,
            }
          )
        }
        entered.current = true
        const interpolate = createTrendInterpolator(
          currentGeometry.current,
          geometry
        )
        const progress = { value: 0 }
        render(interpolate(0))
        return gsap.to(progress, {
          value: 1,
          duration: motion.change,
          ease: motion.ease,
          onUpdate() {
            render(interpolate(progress.value))
          },
        })
      },
      settle
    )
    finishMorph.current = () => {
      cancel()
      settle()
    }

    return () => {
      cancel()
      finishMorph.current = null
      clip?.setAttribute("width", String(plotWidth + 4))
    }
  }, [geometry, reducedMotion])

  useLayoutEffect(() => {
    const ranges = rangesRef.current
    const highlight = highlightRef.current
    const active = ranges?.querySelector<HTMLButtonElement>(
      "button[aria-pressed='true']"
    )
    if (!ranges || !highlight || !active || reducedMotion === null) return
    const tween = gsap.to(highlight, {
      x: active.offsetLeft,
      scaleX: active.offsetWidth,
      duration: reducedMotion || !highlightReady.current ? 0 : 0.28,
      ease: motion.ease,
      overwrite: true,
    })
    highlightReady.current = true
    ranges.dataset.motionReady = "true"
    let width = ranges.clientWidth
    const resize = new ResizeObserver(() => {
      if (width === ranges.clientWidth) return
      width = ranges.clientWidth
      tween.kill()
      gsap.set(highlight, { x: active.offsetLeft, scaleX: active.offsetWidth })
    })
    resize.observe(ranges)
    return () => {
      tween.kill()
      resize.disconnect()
    }
  }, [range, reducedMotion])

  useLayoutEffect(() => {
    const plot = plotRef.current
    const cursor = cursorRef.current
    const marker = markerRef.current
    const tooltip = tooltipRef.current
    if (!plot || !cursor || !marker || !tooltip || reducedMotion === null)
      return

    const elements = { plot, tooltip }
    let point: { x: number; y: number } | null = null
    let visible = false
    let reposition: (() => void) | undefined
    const context = gsap.context(() => {
      const cursorX = gsap.quickSetter(cursor, "x", "px")
      const markerX = gsap.quickSetter(marker, "x", "px")
      const markerY = gsap.quickSetter(marker, "y", "px")
      const tooltipX = gsap.quickTo(tooltip, "x", {
        duration: 0.12,
        ease: motion.ease,
      })
      const tooltipY = gsap.quickTo(tooltip, "y", {
        duration: 0.12,
        ease: motion.ease,
      })
      // Opacity has its own tween; it must never overwrite the position tweens.
      const reveal = gsap.fromTo(
        [cursor, marker, tooltip],
        { opacity: 0 },
        {
          opacity: 1,
          duration: reducedMotion ? 0 : 0.14,
          paused: true,
          immediateRender: false,
        }
      )

      function position(immediate = false) {
        if (!point) return
        const width = elements.plot.clientWidth
        const height = elements.plot.clientHeight
        const x = point.x * width
        const y = point.y * height
        const target = placeTrendTooltip(
          { x, y },
          { width, height },
          {
            width: elements.tooltip.offsetWidth,
            height: elements.tooltip.offsetHeight,
          }
        )
        // The marker and readout identify the same exact datum, even while scrubbing.
        cursorX(x)
        markerX(x)
        markerY(y)
        tooltipX(target.x)
        tooltipY(target.y)
        if (immediate || reducedMotion || !visible) {
          tooltipX.tween.progress(1).pause()
          tooltipY.tween.progress(1).pause()
        }
        if (!visible) reveal.restart()
        visible = true
      }

      moveInspection.current = (next) => {
        point = next
        if (point) position()
        else {
          visible = false
          tooltipX.tween.pause()
          tooltipY.tween.pause()
          reveal.pause()
        }
      }
      reposition = () => position(true)
    }, plot)
    const resize = new ResizeObserver(() => reposition?.())
    resize.observe(plot)
    resize.observe(tooltip)
    return () => {
      resize.disconnect()
      moveInspection.current = null
      context.revert()
    }
  }, [reducedMotion])

  useLayoutEffect(() => {
    moveInspection.current?.(
      selected && activeIndex !== null
        ? {
            x: activeIndex / Math.max(1, points.length - 1),
            y: 1 - (selected.value - min) / span,
          }
        : null
    )
  }, [activeIndex, selected, points.length, min, span, reducedMotion])

  if (!first || !last) return null

  function changeRange(next: TrendRange) {
    if (next === range) return
    setRange(next)
    setActiveIndex(null)
  }

  function inspectPoint(event: PointerEvent<HTMLDivElement>) {
    finishMorph.current?.()
    const bounds = event.currentTarget.getBoundingClientRect()
    const position = Math.min(
      1,
      Math.max(0, (event.clientX - bounds.left) / bounds.width)
    )
    setActiveIndex(Math.round(position * (points.length - 1)))
  }

  function navigatePoints(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      setActiveIndex(null)
      return
    }
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return
    event.preventDefault()
    finishMorph.current?.()
    setActiveIndex((current) => {
      if (event.key === "Home") return 0
      if (event.key === "End") return points.length - 1
      const index = current ?? points.length - 1
      return Math.min(
        points.length - 1,
        Math.max(0, index + (event.key === "ArrowLeft" ? -1 : 1))
      )
    })
  }

  return (
    <section className="asset-trend" aria-labelledby={titleId}>
      <div className="overview-section-heading trend-heading">
        <h2 id={titleId}>
          资产总值走势 <span>（人民币）</span>
        </h2>
        <div
          className="trend-ranges"
          role="group"
          aria-label="走势时间范围"
          ref={rangesRef}
        >
          <span
            className="trend-range-highlight"
            ref={highlightRef}
            aria-hidden="true"
          />
          {trendRanges.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={range === item.id}
              onClick={() => changeRange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <p className="sr-only" id={descriptionId}>
        示例数据，{first.date} 至 {last.date}，从 {formatMoney(first.value)} 到{" "}
        {formatMoney(last.value)}。 聚焦图表后可用左右方向键查看每日数值，Home
        和 End 跳到起止日期，Escape 关闭读数。
      </p>
      <div className="trend-chart">
        <div className="trend-y-axis" aria-hidden="true" ref={axisRef}>
          {Array.from({ length: 5 }, (_, index) => (
            <span key={index} style={{ top: `${(index / 4) * 100}%` }}>
              {Math.round(max - (index / 4) * span).toLocaleString("zh-CN")}
            </span>
          ))}
        </div>
        <div className="trend-plot-column">
          <div
            className="trend-plot"
            ref={plotRef}
            role="group"
            aria-label="资产总值走势图"
            aria-describedby={descriptionId}
            tabIndex={0}
            onPointerMove={inspectPoint}
            onPointerDown={inspectPoint}
            onPointerLeave={() => setActiveIndex(null)}
            onPointerCancel={() => setActiveIndex(null)}
            onKeyDown={navigatePoints}
            onBlur={() => setActiveIndex(null)}
          >
            <svg
              viewBox="0 0 1000 160"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <clipPath id={clipId}>
                  <rect
                    ref={clipRef}
                    x="-2"
                    y="-2"
                    width={plotWidth + 4}
                    height={plotHeight + 4}
                  />
                </clipPath>
              </defs>
              {Array.from({ length: 5 }, (_, index) => (
                <line
                  className="trend-grid"
                  key={`y-${index}`}
                  x1="0"
                  x2="1000"
                  y1={index * 40}
                  y2={index * 40}
                />
              ))}
              {Array.from({ length: 7 }, (_, index) => (
                <line
                  className="trend-grid"
                  key={`x-${index}`}
                  x1={(index / 6) * 1000}
                  x2={(index / 6) * 1000}
                  y1="0"
                  y2="160"
                />
              ))}
              <g clipPath={`url(#${clipId})`}>
                <path
                  ref={areaRef}
                  className="trend-area"
                  d={`${line} L1000,160 L0,160 Z`}
                />
                <path
                  ref={lineRef}
                  className="trend-line"
                  d={line}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            </svg>
            <div hidden={!selected} className="trend-inspection">
              <div className="trend-cursor" ref={cursorRef} />
              <div
                className="trend-marker"
                ref={markerRef}
                aria-hidden="true"
              />
              <output
                className="trend-tooltip"
                ref={tooltipRef}
                aria-live="polite"
                aria-atomic="true"
              >
                <time dateTime={selected?.date}>
                  {selected?.date.replaceAll("-", ".")}
                </time>
                <span className="trend-tooltip-label">资产总值</span>
                <strong>{formatMoney(selected?.value ?? last.value)}</strong>
              </output>
            </div>
          </div>
          <div className="trend-x-axis" aria-hidden="true">
            {dateLabels.map((date, index) => (
              <span key={`${date}-${index}`}>
                {range === "all" || range === "1y"
                  ? date.slice(0, 7).replace("-", ".")
                  : date.slice(5)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
