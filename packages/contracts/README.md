# 共享 HTTP 契约

`@workspace/contracts` 由 Web 与 API 通过公开入口 `@workspace/contracts/auth` 消费。当前包含登录请求、认证会话、平台角色和错误响应的 Zod 4.4.3 运行时模式，以及由模式推导的类型。

包不包含业务实体、权限政策、数据库类型、API 客户端或凭据存储。API 在输入与输出边界使用这些模式，Web 验证请求与响应。

构建产生 `dist` 中的 CommonJS 代码和类型声明，使 NestJS 与 Next.js 都可以消费同一公开入口。先运行 `pnpm --filter @workspace/contracts build`，再单独运行消费者检查；根目录 Turbo 的开发、检查和构建任务会先生成契约产物，支持新检出的工作区。

契约当前是私有仓库内部的 `0.0.0` 包，不独立发布。兼容性变更必须同步更新 API、客户端和端到端测试；未来需要独立部署兼容窗口时另行制定版本策略。
