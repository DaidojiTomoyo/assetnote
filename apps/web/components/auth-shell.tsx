import type { ReactNode } from "react"

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="auth-shell">
      <section className="auth-brand" aria-label="AssetNote 产品介绍">
        <p className="auth-wordmark">AssetNote</p>
        <div className="auth-introduction">
          <p className="auth-statement">
            记录持仓，
            <br />
            关注行情。
          </p>
          <p className="auth-description">个人资产的记录与观察空间。</p>
        </div>
        <p className="auth-disclaimer">仅记录资产，不参与交易</p>
      </section>
      <section className="auth-access" aria-labelledby="auth-title">
        <div className="auth-content">{children}</div>
      </section>
    </main>
  )
}
