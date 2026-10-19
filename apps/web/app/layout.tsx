import type { Metadata } from "next"

import "@workspace/ui/globals.css"
import "./styles.css"
import { ThemeProvider } from "@/components/theme-provider"

export const metadata: Metadata = {
  title: { default: "AssetNote", template: "%s · AssetNote" },
  description: "个人持仓记录与行情查看。",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className="antialiased">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
