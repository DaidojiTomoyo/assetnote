# AssetNote Web

Web 负责中文登录、资产总览与全局导航，通过 HTTP 使用 API 的认证能力。总览当前使用明确标注的示例数据；钱包持久化、持仓录入与行情接入尚未实现。

## 本地预览

先在仓库根目录安装依赖并构建共享契约：

```bash
pnpm install
pnpm --filter @workspace/contracts build
```

端口被占用时，可以在两个终端分别启动独立预览实例：

```bash
PORT=3201 WEB_ORIGIN=http://localhost:3200 pnpm --filter api exec ts-node -r tsconfig-paths/register src/main.ts
```

```bash
ASSETNOTE_PREVIEW=1 NEXT_PUBLIC_API_ORIGIN=http://localhost:3201 pnpm --filter web dev --port 3200
```

访问 <http://localhost:3200/login>。API 使用现有本地数据库配置，不执行迁移或创建账户。这个 API 预览命令直接运行源码，不占用其他 API 实例的 `dist` 输出；修改 API 源码后需重启该预览进程。

只检查首页设计时，可访问 <http://localhost:3200/preview>。此路由仅在开发模式可用，使用示例身份与虚构资产，不请求 API，也不代表用户已登录；生产运行返回 404。它与 `/account` 使用相同的首页组件。`/preview?section=wallets` 和 `/preview?section=market` 可查看导航目标的未开放状态。

`ASSETNOTE_PREVIEW=1` 让 Next.js 使用 `.next-preview`，与默认 `.next` 目录隔离。预览之外可以照常运行 `pnpm --filter web dev`。

## 环境配置

| 变量                     | 用途                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_API_ORIGIN` | 浏览器可访问的 API 来源，例如 `http://localhost:3201`；仅包含协议、主机和端口，不含 `/api` |
| `ASSETNOTE_PREVIEW`      | 设置为 `1` 时使用独立构建目录 `.next-preview`                                              |

生产构建必须设置 `NEXT_PUBLIC_API_ORIGIN`，Next.js 会将其写入浏览器包；它不是秘密。开发时未设置则使用 `http://localhost:3001`。API 的 `WEB_ORIGIN` 必须与浏览器实际访问的来源完全一致，`localhost` 和 `127.0.0.1` 不混用。生产环境的 Web 和 API 应使用同站点的 HTTPS 来源，以满足服务端 Cookie 策略。

认证使用 API 设置的 HttpOnly Cookie，Web 不读取或保存会话令牌。登录后进入 `/account`，核验当前会话后显示资产总览；账户菜单提供角色、外观设置与退出。没有公开注册、密码恢复或“记住我”功能。

## 首页范围

- `/account` 展示总资产、股票与现金占比、钱包摘要、可切换周期的资产走势和持仓列表；点击钱包可筛选持仓，再清除筛选返回全部。
- 走势图支持鼠标查看数值，也支持聚焦后使用左右方向键、Home 和 End。手机持仓表优先显示名称、金额和占比，钱包名称移至资产名称下方。
- `/wallets` 与 `/market` 复用全局导航和真实会话检查，明确说明功能尚未开放；首页的“记录持仓”入口说明当前状态，不模拟保存。
- 三个业务路由共用 `app/(workspace)/layout.tsx`，切换时保留导航和账户状态，并在后台重新核验会话；会话失效仍返回登录。开发预览也使用独立的共享布局。
- 所有资产、名称与历史走势来自 `features/overview/overview-model.ts` 的呈现示例，固定截至 2026-05-31，不代表账户资产、实时行情或收益。页面持续显示“示例数据 · 非实时行情”。
- 本次没有新增业务 HTTP 契约、浏览器持久化或上游行情请求；实际钱包和行情接入仍由 API 负责。

## 总览动效

`gsap` 仅由 Web 工作区依赖，动效代码位于 `features/overview/`。保持 A 版布局与示例数据语义：

- 进入总览时，金额累进、配置比例展开、走势图沿时间轴绘入；屏幕外的动画在进入视野时启动。
- 切换周期时，曲线与纵轴在 420ms 内从当前画面过渡到新范围，选中背景同步滑动；快速连续切换会接续中途状态。曲线插值保留两组数据的全部顶点，最后恢复精确目标路径。
- 钱包筛选保留持仓行的位置关系，持仓合计在当前值与新值之间补间。合计仅统计可见股票持仓，不包含钱包现金；上方总资产仍展示全局金额。
- 鼠标、触摸与方向键查看图表时，日期、金额与指示点同步定位到同一条数据；浮层位置通过 GSAP `quickTo` 平滑跟随，避免高频移动时动画相互覆盖。浮层按实际尺寸在图表边缘翻转、限位，窗口缩放时重新定位。Home/End 可定位起止日期，Escape 关闭读数。
- `prefers-reduced-motion: reduce` 下直接呈现结果。动画离开视野或页面隐藏时结束，组件卸载时清理 GSAP 动画、媒体查询监听与观察器。没有常驻循环或额外动画插件。

回归测试覆盖曲线端点、数据顶点保留、连续中断、空数据、减少动态效果与动画清理；浏览器检查覆盖桌面和手机宽度、深浅主题、菜单切换、周期切换、钱包筛选和键盘查看。手机检查为视口模拟，未测量实体设备帧率。

已有账户可直接使用。首个管理员的创建按[受控引导操作](../../docs/operations/bootstrap-super-admin.md)执行，不在登录页中创建。

## 验证

```bash
pnpm --filter web lint
pnpm --filter web typecheck
pnpm --filter web test
pnpm --filter web build
```

首次运行检查前需要构建 `@workspace/contracts`。提交前使用仓库根目录的 `pnpm verify`。
