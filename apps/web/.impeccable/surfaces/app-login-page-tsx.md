---
version: 1
slug: "app-login-page-tsx"
primary_target: "app/login/page.tsx"
related_targets: ["app/account/page.tsx"]
---

# 登录页

Mode: Operate

范围：`/login` 的中文邮箱密码登录，接入 API，包含校验、提交中、凭证错误、限流和网络错误；成功后进入 `/account` 核验会话并可退出。保留邀请制，不加入公开注册或未实现的密码恢复入口。

## Direction contract

THESIS：回到个人资产记录空间。用户选择左右分屏，让品牌介绍与登录操作分别占据明确区域；表单直接放在页面上，不套外层卡片。

OWN-WORLD：继承既有青柠色、黑白、直角控件与系统无衬线 UI 语言。青柠面承担产品说明，黑色按钮承担唯一主操作。

STORY：看到 AssetNote 与“记录持仓，关注行情”，知道这是受邀用户入口，填写邮箱密码后进入会话确认页；错误必须说明下一步。

FIRST VIEWPORT：1440×900 时左侧约 43% 青柠区域，品牌位于左上，52px 两行主题居中偏上，底部说明不参与交易；右侧白底中央放 400px 表单。移动端缩短品牌区，表单全宽减双侧 24px。焦点细线是签名交互，随输入明确当前操作位置；所有状态保持布局稳定。

FORM：左右分屏，候选序号 2，seed key `f01a83cf`，用户在选择页确认 `split`，code-first。构图依据 `.impeccable/mocks/decision/split.html`；无已批准图片稿。保留系统深浅色支持，深色只调整操作区以维持可读性。

FINISH：unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

完成证据：桌面、移动和用户实际窗口截图；真实 API 的错误反馈；共享契约与认证端到端测试。未提供真实账户密码时不声称验证过个人账户的成功登录。

## Delight refinement

以“做记录时的利落感”统一交互：聚焦字段时，标签旁的书签标记与底部细线在 140–220ms 内显现；错误字段沿用错误色。密码可见时，眼睛按钮以青柠底表示按下状态。登录按钮右侧的固定方格承接箭头与真实请求中的加载图标，悬停或键盘聚焦仅让箭头向前移动 3px。标题、表单与反馈区不移动，不添加入场动画或人为等待；减少动态效果模式保留即时状态反馈并停止图标转动。
