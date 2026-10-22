---
version: 1
slug: "app-workspace-settings-layout-tsx"
primary_target: "app/(workspace)/settings/layout.tsx"
related_targets: []
---

# 账户设置与用户管理

Mode: Operate

用户于 2026-10-22 选定 A+C 并确认完整功能范围。A 的集中设置入口与名单，C 的独立用户详情；个人资料修改昵称与头像、邮箱只读，密码独立保存。

## Direction contract

THESIS：名单负责查找，详情负责权限操作；个人设置与管理功能由局部导航组织。

OWN-WORLD：现有青柠顶栏、白地墨黑、系统无衬线、细线、直角控件；深色使用现有语义色。头像保留圆形。

STORY：从头像进入设置，查找用户、打开详情、修改角色或状态；邀请生成链接并由管理员分享；个人修改资料或密码。

FIRST VIEWPORT：A 名单参考 1504×1046，68px 顶栏、5% 外侧留白；设置标题下为 210px 局部导航和名单工作区，头部右侧邀请按钮，下方搜索筛选及开放式表格。C 详情参考 1505×1045，返回名单后标题，约 30% 身份摘要、70% 角色和状态表单；窄屏堆叠。个人表单沿 A 局部导航、分别落在个人资料和账户安全。签名交互为保存按钮内嵌青柠箭头与 GSAP 轻量反馈，减少动态效果时静止。

FORM：A 集中设置（原 7）+ C 独立账户详情（原 4），seed key `717ecb0d`。Operate 沿用项目 code-led 实现；设计探索图是已批准的结构与完成度依据，不生成 UI 栅格素材。引用 .impeccable/mocks/decision/accounts-settings.png、accounts-detail.png、accounts-personal.png。删除图中重复加入日期和示例身份，纠正生成的蓝色链接与小圆角；预览样例明确标记。

FINISH：unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

验收：真实 API、运行时契约、事务与权限，列表筛选分页、详情角色状态、邀请创建撤销重邀接受、资料头像及密码修改；错误、空、加载、保存反馈、键盘、桌面/手机/深色。API 不暴露密码哈希和令牌哈希，邀请码只首次显示，7 日有效；后台身份不授予他人资产访问权。不添加邮件发送、密码恢复、邮箱修改、用户删除或超级管理员创建。
