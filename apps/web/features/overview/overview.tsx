"use client"

import { useId, useLayoutEffect, useRef, useState } from "react"
import { gsap } from "gsap"
import Link from "next/link"
import { ArrowRight, ChevronRight, X } from "lucide-react"
import { AssetTrend } from "./asset-trend"
import { AnimatedNumber } from "./animated-number"
import { animateWhenVisible, motion, useReducedMotion } from "./motion"
import {
  exampleHoldings,
  examplePortfolio,
  filterHoldings,
  formatMoney,
  getWalletName,
  type WalletFilter,
} from "./overview-model"

export function Overview({ preview = false }: { preview?: boolean }) {
  const noticeId = useId()
  const holdingsRef = useRef<HTMLElement>(null)
  const allocationRef = useRef<HTMLDivElement>(null)
  const tableBodyRef = useRef<HTMLTableSectionElement>(null)
  const rowPositions = useRef(new Map<string, number>())
  const reducedMotion = useReducedMotion()
  const [wallet, setWallet] = useState<WalletFilter>("all")
  const holdings = filterHoldings(exampleHoldings, wallet)
  const holdingsTotal = holdings.reduce(
    (total, holding) => total + holding.value,
    0
  )
  const walletsHref = preview ? "/preview?section=wallets" : "/wallets"

  useLayoutEffect(() => {
    const allocation = allocationRef.current
    if (!allocation || reducedMotion === null || reducedMotion) return
    const cancel = animateWhenVisible(
      allocation,
      () =>
        gsap.fromTo(
          allocation,
          { clipPath: "inset(0 100% 0 0)" },
          {
            clipPath: "inset(0 0% 0 0)",
            duration: motion.entrance,
            ease: motion.ease,
          }
        ),
      () => {
        gsap.set(allocation, { clearProps: "clipPath" })
      }
    )
    return () => {
      cancel()
      gsap.set(allocation, { clearProps: "clipPath" })
    }
  }, [reducedMotion])

  useLayoutEffect(() => {
    const body = tableBodyRef.current
    if (!body || reducedMotion === null) return
    const previous = rowPositions.current
    rowPositions.current = new Map()
    if (reducedMotion || previous.size === 0) return
    const top = body.getBoundingClientRect().top
    const context = gsap.context(() => {
      body
        .querySelectorAll<HTMLTableRowElement>("tr[data-holding-id]")
        .forEach((row) => {
          const before = previous.get(row.dataset.holdingId ?? "")
          const after = row.getBoundingClientRect().top - top
          gsap.fromTo(
            row,
            {
              y: before === undefined ? 0 : before - after,
              opacity: before === undefined ? 0 : 1,
            },
            {
              y: 0,
              opacity: 1,
              duration: before === undefined ? motion.feedback : motion.change,
              ease: motion.ease,
              clearProps: "transform,opacity",
            }
          )
        })
    }, body)
    return () => context.revert()
  }, [wallet, reducedMotion])

  function selectWallet(next: WalletFilter) {
    const body = tableBodyRef.current
    if (next !== wallet && body) {
      const top = body.getBoundingClientRect().top
      const rows = body.querySelectorAll<HTMLTableRowElement>(
        "tr[data-holding-id]"
      )
      rowPositions.current = new Map(
        Array.from(rows, (row) => [
          row.dataset.holdingId ?? "",
          row.getBoundingClientRect().top - top,
        ])
      )
      // Capture the displayed position before interrupting an in-flight filter.
      gsap.killTweensOf(rows)
      gsap.set(rows, { clearProps: "transform,opacity" })
    }
    setWallet(next)
    holdingsRef.current?.focus({ preventScroll: true })
    holdingsRef.current?.scrollIntoView({ block: "nearest" })
  }

  return (
    <>
      <div className="overview-page-heading">
        <h1>资产总览</h1>
        <div className="overview-heading-actions">
          <button
            className="workspace-primary"
            type="button"
            popoverTarget={noticeId}
          >
            <span>记录持仓</span>
            <span className="workspace-button-arrow">
              <ArrowRight size={21} aria-hidden="true" />
            </span>
          </button>
          <p className="workspace-example-note">示例数据 · 非实时行情</p>
        </div>
        <div className="workspace-notice" id={noticeId} popover="auto">
          <div className="workspace-notice-title">
            <h2>持仓录入尚未开放</h2>
            <button
              className="workspace-icon-button"
              type="button"
              popoverTarget={noticeId}
              popoverTargetAction="hide"
              aria-label="关闭提示"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <p>
            当前总览展示的是示例资产。钱包记录功能开放后，你可以在这里录入自己的持仓。
          </p>
          <button
            className="workspace-text-button"
            type="button"
            popoverTarget={noticeId}
            popoverTargetAction="hide"
            onClick={() => selectWallet("all")}
          >
            查看示例持仓 <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="overview-summary">
        <section className="asset-summary" aria-labelledby="asset-total-title">
          <h2 id="asset-total-title">
            资产总额 <span>（人民币）</span>
          </h2>
          <p className="asset-total">
            <AnimatedNumber value={examplePortfolio.total} />
          </p>
          <div
            className="asset-allocation"
            ref={allocationRef}
            role="img"
            aria-label="股票占总资产 90%，现金占 10%"
          >
            <div className="asset-allocation-stocks">
              <span>90%</span>
            </div>
            <div className="asset-allocation-cash">
              <span>10%</span>
            </div>
          </div>
          <dl className="asset-legend">
            <div>
              <dt>
                <span className="asset-key asset-key-stocks" />
                股票
              </dt>
              <dd>
                <AnimatedNumber value={examplePortfolio.stocks} />
              </dd>
            </div>
            <div>
              <dt>
                <span className="asset-key asset-key-cash" />
                现金
              </dt>
              <dd>
                <AnimatedNumber value={examplePortfolio.cash} />
              </dd>
            </div>
          </dl>
        </section>
        <section className="overview-wallets" aria-labelledby="wallets-title">
          <div className="overview-section-heading">
            <h2 id="wallets-title">钱包</h2>
            <Link className="workspace-text-link" href={walletsHref}>
              查看全部 <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <ul className="wallet-list">
            {examplePortfolio.wallets.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => selectWallet(item.id)}
                  aria-pressed={wallet === item.id}
                  aria-label={`查看${item.name}的示例持仓，${formatMoney(item.value)}`}
                >
                  <span>{item.name}</span>
                  <span className="wallet-value">
                    <AnimatedNumber value={item.value} />
                  </span>
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <AssetTrend />

      <section
        className="holdings-section"
        aria-labelledby="holdings-title"
        ref={holdingsRef}
        tabIndex={-1}
      >
        <div className="overview-section-heading holdings-heading">
          <h2 id="holdings-title">持仓明细</h2>
          {wallet !== "all" && (
            <button
              type="button"
              className="holdings-filter"
              onClick={() => selectWallet("all")}
              aria-label={`清除${getWalletName(wallet)}筛选`}
            >
              {getWalletName(wallet)} <X size={14} aria-hidden="true" />
            </button>
          )}
          <p className="holdings-subtotal">
            <span>合计</span>{" "}
            <AnimatedNumber value={holdingsTotal} entrance={false} />
          </p>
          <p className="sr-only" role="status">
            {wallet === "all" ? "全部钱包" : getWalletName(wallet)}，共{" "}
            {holdings.length} 条示例持仓，持仓市值合计{" "}
            {formatMoney(holdingsTotal)}
          </p>
        </div>
        <div
          className="holdings-table-scroll"
          role="region"
          aria-label="持仓明细表"
          tabIndex={0}
        >
          <table className="holdings-table">
            <caption className="sr-only">
              示例持仓，资产名称和金额均为虚构。占比按全部示例资产计算。
            </caption>
            <colgroup>
              <col className="holding-name-col" />
              <col className="holding-wallet-col" />
              <col className="holding-type-col" />
              <col className="holding-value-col" />
              <col className="holding-ratio-col" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">名称</th>
                <th scope="col" className="holding-wallet-cell">
                  所属钱包
                </th>
                <th scope="col" className="holding-type-cell">
                  资产类别
                </th>
                <th scope="col" className="holding-value">
                  持仓市值 <span>（人民币）</span>
                </th>
                <th scope="col" className="holding-ratio-heading">
                  占总资产比例
                </th>
              </tr>
            </thead>
            <tbody ref={tableBodyRef}>
              {holdings.map((holding) => {
                const ratio = (holding.value / examplePortfolio.total) * 100
                return (
                  <tr key={holding.id} data-holding-id={holding.id}>
                    <th scope="row">
                      {holding.name}
                      <small className="holding-mobile-wallet">
                        {getWalletName(holding.walletId)}
                      </small>
                    </th>
                    <td className="holding-wallet-cell">
                      {getWalletName(holding.walletId)}
                    </td>
                    <td className="holding-type-cell">股票</td>
                    <td className="holding-value">
                      {formatMoney(holding.value)}
                    </td>
                    <td>
                      <div className="holding-ratio">
                        <span>{ratio.toFixed(1)}%</span>
                        <span
                          className="holding-ratio-track"
                          aria-hidden="true"
                        >
                          <span style={{ width: `${ratio}%` }} />
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
