---
name: AssetNote Web
description: 青柠色、黑白与直角控件构成的个人资产记录界面。
colors:
  primary: "oklch(0.841 0.238 128.85)"
  primary-dark: "oklch(0.768 0.233 130.85)"
  auth-lime: "#b9ef46"
  auth-ground: "#ffffff"
  auth-ink: "#191b16"
  auth-muted: "#60645c"
  auth-border: "#aeb5a5"
  auth-focus: "#436a0e"
  auth-error: "#b22d26"
  auth-brand-copy: "#36451d"
  auth-ground-dark: "#1b1f18"
  auth-ink-dark: "#f2f4ed"
  auth-muted-dark: "#b3baac"
  auth-border-dark: "#69735e"
  auth-error-dark: "#ffb4a8"
typography:
  title:
    fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "32px"
    fontWeight: 600
    lineHeight: "44px"
    letterSpacing: "-0.025em"
  body:
    fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "24px"
  label:
    fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "14px"
    fontWeight: 550
    lineHeight: "22px"
  helper:
    fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "22px"
rounded:
  square: "0"
spacing:
  field-inset: "16px"
  field-gap: "24px"
  mobile-gutter: "24px"
components:
  button-primary:
    backgroundColor: "{colors.auth-ink}"
    textColor: "{colors.auth-ground}"
    rounded: "{rounded.square}"
    padding: "12px 20px"
    width: "100%"
  button-primary-dark:
    backgroundColor: "{colors.auth-lime}"
    textColor: "{colors.auth-ink}"
    rounded: "{rounded.square}"
  input:
    backgroundColor: "{colors.auth-ground}"
    textColor: "{colors.auth-ink}"
    rounded: "{rounded.square}"
    padding: "0 16px"
    height: "54px"
    width: "100%"
  password-visibility:
    backgroundColor: "transparent"
    textColor: "{colors.auth-muted}"
    height: "44px"
    width: "44px"
  feedback:
    textColor: "{colors.auth-error}"
    height: "48px"
---

# Design System: AssetNote Web

## Overview

**Creative North Star: "个人资产的记录与观察空间"**

青柠色提供清晰的品牌识别，黑白操作区与直角控件保持直接、平静的记录工具气质。当前实现服务于受邀用户的登录与会话确认；不以交易终端或营销证明包装尚未实现的资产功能。

本文记录已实现的 Web 认证界面。共享基础变量来自 `packages/ui/src/styles/globals.css`，认证页局部覆盖来自 `app/styles.css`；后者没有替换共享色板。登录页分屏构图属于该页面，详见[表面说明](./.impeccable/surfaces/app-login-page-tsx.md)，不作为所有后续页面的模板。

**Key Characteristics:**

- 青柠品牌面与中性操作区。
- 直角、细边框、清晰焦点。
- 中文表单、克制说明与稳定反馈位置。
- 深浅色适配和减少动态效果支持。

## Colors

颜色由共享青柠基础色和认证页的局部语义色组成；前言保留各自实际使用的格式。

### Primary

- **共享青柠：** `primary` 与 `primary-dark` 对应共享组件库的深浅色主色，不改写为认证页的十六进制值。
- **认证青柠：** `auth-lime` 用于产品介绍面、文字选区，以及深色模式的主按钮和焦点。
- **深绿焦点：** `auth-focus` 用于浅色模式的输入光标、聚焦边框和轮廓。

### Neutral

- **纸白与墨黑：** `auth-ground`、`auth-ink` 构成浅色操作区；主按钮反转这组颜色。
- **灰绿层次：** `auth-muted` 用于说明和占位文字，`auth-border` 用于字段和账户详情分隔，`auth-brand-copy` 用于青柠面上的次级文字。
- **深色操作区：** `auth-ground-dark`、`auth-ink-dark`、`auth-muted-dark`、`auth-border-dark` 对应深色覆盖；品牌面保持原样。

错误使用 `auth-error`，深色模式使用 `auth-error-dark`，同时提供文字和字段语义状态。

**The Local Color Rule.** 认证页颜色只覆盖认证容器，不改写共享组件库的颜色定义。

侧车的八阶色条仅为预览生成的明度变化，不是新增的生产色阶。

## Typography

**Body Font:** 系统无衬线字体栈，包含苹方和微软雅黑作为中文回退。表单以可读性和平台一致性为主。

前言记录标题、正文、标签和辅助文案的实际字号。页面标题在窄屏降至 28px / 38px；字段输入文字为 16px，主按钮为 15px、600 字重。当前品牌主题文字采用系统字体的响应式大字（`clamp(36px, 3.62vw, 58px)`，窄屏 28px），这是该页面的既有实现，不定义为后续页面必须沿用的展示字体规范。

## Layout

认证外壳最小高度为 `100svh`。桌面以 43.05% 品牌列和剩余操作列分屏，操作内容最大宽度 400px，直接放在页面上。字段之间使用前言中的间距，标签与字段相隔 10px。

宽度不超过 760px 时，品牌区在上、操作区在下，左右留白均为 24px；操作区顶部留白 40px、底部 48px。此处记录登录和账户页共用外壳的现状，不约束未来业务页面的布局。

## Elevation & Depth

当前认证界面没有阴影。区域依靠背景色、留白与细线分隔；焦点轮廓表达操作状态，不承担装饰性浮层效果。

## Shapes

输入框和主按钮保持直角，与共享组件库的零圆角基础一致。输入边框为 1px；焦点轮廓为 2px。密码可见性按钮嵌入字段，默认透明、密码可见时使用青柠底，触达区域为前言所列尺寸。

## Components

### Buttons

主操作通栏，最小高度 54px。浅色模式使用墨黑底与白字，深色模式使用青柠底与墨黑字；默认悬停透明度为 0.86，提交中禁用并降至 0.62。键盘焦点轮廓向外偏移 4px。登录按钮保持悬停不透明，右侧内缩 6px 的固定方格承接箭头与加载图标；箭头在悬停或键盘聚焦时前移 3px，文案保持居中。

### Inputs / Fields

字段使用有形标签、边框和同色背景。焦点轮廓向外偏移 2px，标签旁的书签标记与输入底部细线同步指示当前字段。错误改变边框及聚焦标记的颜色，并设置 `aria-invalid`。提交中字段只读、透明度为 0.7。密码显示按钮提供独立的可访问名称与按下状态。

### Feedback

表单预留固定反馈区，尺寸见前言；长文案可在区内滚动。错误字段描述使用屏幕阅读器可读的隐藏文本，汇总反馈使用 `role="alert"`。空表单、校验错误、修正输入和 API 错误保持按钮位置稳定。

### Account details

会话确认页使用定义列表，行内上下留白 16px，底部细线分隔，内容支持长文本换行。认证区域没有额外卡片或导航组件。

字段边框、显隐按钮颜色和按钮透明度变化使用 140ms `ease-out`；书签与箭头位移为 180ms，焦点细线为 220ms，均使用 `cubic-bezier(0.16, 1, 0.3, 1)`。提交图标以 850ms 线性旋转。减少动态效果偏好关闭过渡、位移和旋转，同时保留即时状态与提交文字反馈。

## Do's and Don'ts

### Do:

- **Do** 保留认证页语义颜色的作用域以及共享组件库原有变量。
- **Do** 保留清晰标签、键盘焦点、错误文字和稳定的反馈位置。
- **Do** 在深色模式和减少动态效果模式下保持状态可读。

### Don't:

- **Don't** 用条件出现的可见字段错误段落推动登录按钮。
- **Don't** 把登录页的分屏构图规定为全部业务页面的布局。
- **Don't** 把示例资产、交易能力或未实现功能展示为真实产品证据。
