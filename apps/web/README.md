# AssetNote Web

Web 负责中文登录页面、会话状态与交互，通过 HTTP 使用 API 的认证能力。

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

`ASSETNOTE_PREVIEW=1` 让 Next.js 使用 `.next-preview`，与默认 `.next` 目录隔离。预览之外可以照常运行 `pnpm --filter web dev`。

## 环境配置

| 变量                     | 用途                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_API_ORIGIN` | 浏览器可访问的 API 来源，例如 `http://localhost:3201`；仅包含协议、主机和端口，不含 `/api` |
| `ASSETNOTE_PREVIEW`      | 设置为 `1` 时使用独立构建目录 `.next-preview`                                              |

生产构建必须设置 `NEXT_PUBLIC_API_ORIGIN`，Next.js 会将其写入浏览器包；它不是秘密。开发时未设置则使用 `http://localhost:3001`。API 的 `WEB_ORIGIN` 必须与浏览器实际访问的来源完全一致，`localhost` 和 `127.0.0.1` 不混用。生产环境的 Web 和 API 应使用同站点的 HTTPS 来源，以满足服务端 Cookie 策略。

认证使用 API 设置的 HttpOnly Cookie，Web 不读取或保存会话令牌。登录后进入 `/account` 核验当前会话并提供退出入口；业务钱包与行情页面尚未实现。没有公开注册、密码恢复或“记住我”功能。

已有账户可直接使用。首个管理员的创建按[受控引导操作](../../docs/operations/bootstrap-super-admin.md)执行，不在登录页中创建。

## 验证

```bash
pnpm --filter web lint
pnpm --filter web typecheck
pnpm --filter web test
pnpm --filter web build
```

首次运行检查前需要构建 `@workspace/contracts`。提交前使用仓库根目录的 `pnpm verify`。
