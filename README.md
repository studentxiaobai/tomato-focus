# 番茄闹钟

一个以自定义封面为主视觉的公开番茄钟网站。用户可以使用邮箱注册登录，在右上角运行番茄计时器、在右侧维护任务，在左下角播放自己的背景音乐，并把完整完成的专注时长同步到学习统计。

## 已实现功能

- 邮箱注册、密码登录、邮箱验证、找回密码和退出登录
- 25/5/15 分钟、每 4 个番茄长休息的默认节奏，全部可调整
- 刷新、关闭页面后按绝对结束时间恢复计时
- 完整专注自动累计学习时长，并增加关联任务的完成番茄数
- 任务新增、编辑、删除、排序、勾选和当前任务选择
- 最近 7 天趋势、今日、本周、累计时长和完成番茄统计
- 用户私有背景图片与多音频播放列表
- 文件夹上传或多文件选择，播放、上一首、下一首、循环、音量和进度控制
- 自动播放被浏览器拦截时，会自动显示可点击的继续播放提示
- 中文界面，电脑优先并适配手机抽屉式布局

## 本地运行

需要 Node.js 22 或更高版本，以及 pnpm。

```powershell
pnpm install
Copy-Item .env.example .env.local
pnpm dev
```

打开终端显示的本地地址。

## 当前电脑状态

这台电脑已经连接 Supabase 项目，邮箱注册、登录验证、数据库、任务、学习统计和私有存储桶均已完成配置。连接信息保存在已被 Git 忽略的 .env.local 中，请勿公开或提交该文件。

如果后续要搬到另一台电脑，需要重新创建 .env.local 并执行下面的 Supabase 配置步骤。

## 配置 Supabase

1. 在 Supabase 新建项目。
2. 在 SQL Editor 执行 `supabase/migrations/202609100001_initial_schema.sql`。
3. 在 Authentication > Providers 中启用 Email。
4. 在 URL Configuration 中加入本地及生产回调地址，例如：
   - `http://localhost:5173/login?verified=1`
   - `http://localhost:5173/reset-password`
   - `https://你的域名/login?verified=1`
   - `https://你的域名/reset-password`
5. 正式公开前配置生产 SMTP 和中文邮件模板。
6. 将项目 URL 和 anon key 填入 `.env.local`：

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

数据库迁移会创建 `backgrounds`、`music` 两个私有存储桶，以及所有表的 RLS 策略。不要把 service role key 放进前端环境变量。

## 验证

```powershell
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Playwright 默认使用 Chromium；首次运行前安装浏览器：

```powershell
pnpm exec playwright install chromium
```

Windows 已安装 Edge 时，也可以不下载 Chromium 直接验证：

```powershell
$env:PLAYWRIGHT_USE_SYSTEM_EDGE='1'; pnpm test:e2e
```

数据库策略测试位于 `supabase/tests/rls_checks.sql`，使用 pgTAP 在 Supabase SQL Editor 或本地 Supabase 测试环境运行。

## 部署到 Vercel

1. 把项目推送到 Git 仓库。
2. 在 Vercel 导入项目。
3. 添加 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` 生产环境变量。
4. 构建命令使用 `pnpm build`，输出目录使用 `dist`。
5. 部署后把正式域名补进 Supabase Auth 回调地址。
6. `vercel.json` 已包含单页应用路由回退规则。

## 媒体授权

根目录中的 `demo-assets` 来自用户提供的原始图片和 MP3，只用于本地开发预览，不会被正式生产构建复制。公开上线前请替换为拥有公开使用权限的素材，或保持生产环境的中性渐变封面和空播放列表，由用户自行上传。

## 主要目录

```text
src/components/       页面组件与叠加面板
src/features/timer/   计时状态机
src/hooks/            计时器与工作区数据逻辑
src/lib/              Supabase、上传、统计和工具函数
supabase/migrations/  数据库、RLS 与 Storage 迁移
tests/e2e/            Playwright 端到端测试
demo-assets/          仅开发环境使用的示例媒体
```


