import Link from "next/link"
import { ArrowLeft, ChartNoAxesCombined, Wallet } from "lucide-react"

export function WorkspaceUnavailable({
  section,
  preview = false,
}: {
  section: "wallets" | "market"
  preview?: boolean
}) {
  const isWallet = section === "wallets"
  return (
    <>
      <div className="overview-page-heading">
        <h1>{isWallet ? "钱包" : "行情"}</h1>
      </div>
      <section
        className="workspace-unavailable"
        aria-labelledby="feature-status-title"
      >
        {isWallet ? (
          <Wallet size={36} strokeWidth={1.4} aria-hidden="true" />
        ) : (
          <ChartNoAxesCombined size={36} strokeWidth={1.4} aria-hidden="true" />
        )}
        <h2 id="feature-status-title">
          {isWallet ? "钱包记录尚未开放" : "行情数据尚未接入"}
        </h2>
        <p>
          {isWallet
            ? "这里将用于管理个人钱包和记录持仓。当前总览中的钱包与资产均为示例，尚未保存你的资产记录。"
            : "这里将用于查看股票行情。当前没有连接行情来源，总览中的数值与走势均为示例。"}
        </p>
        <Link
          className="workspace-text-link"
          href={preview ? "/preview" : "/account"}
        >
          <ArrowLeft size={17} aria-hidden="true" />
          返回资产总览
        </Link>
      </section>
    </>
  )
}
