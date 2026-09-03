# DDL Manager · 邮箱提醒后端（Supabase + Resend）

本文件夹包含云端「自动邮件提醒」所需的全部文件。密钥不会写进代码文件。

## 文件说明

| 文件 | 作用 |
|---|---|
| `schema.sql` | 建数据表（tasks / email_logs）+ 注册每 30 分钟定时任务 |
| `functions/send-reminders/index.ts` | 云端发信函数：扫描到期任务 → 调 Resend 发邮件 → 写日志去重 |

## 部署步骤（全部在 Supabase 网页上完成，共 3 步）

### 第 1 步：运行建表 SQL
1. 打开 https://supabase.com/dashboard → 选择项目 `DDL Manager`
2. 左侧 **SQL Editor** → **New query**
3. 用文本编辑打开本目录的 `schema.sql`，全选复制，粘贴进去
4. 点右下角 **Run**（只运行一次）
5. 看到绿色成功提示即可（里面有 3 段语句，都可能显示成功）

### 第 2 步：创建发信函数 send-reminders
1. 左侧 **Edge Functions** → **Create a new function**
2. Name 填 `send-reminders`，点 Create
3. 在网页代码编辑器里，全选删除默认代码，粘贴
   `functions/send-reminders/index.ts` 的全部内容
4. 点 **Deploy** 部署

### 第 3 步：添加 Resend 密钥（只有这一个需要手动加）
1. 在同一个 Edge Functions 页面，点该函数 → **Secrets**（或 Settings）
2. 添加：
   - Key: `RESEND_API_KEY`
   - Value: `re_xxxxxxxxxxxxxxxxxxxx`
3. 保存（可能需要重新 Deploy 一次让密钥生效）

> 说明：`SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY` 是 Supabase 自动注入的，
> 你不需要（也不应该）手动粘贴 service_role key 到任何地方。

### 验证
部署完成后，在 Edge Functions 页面点 **Invoke / Test** 运行一次，
正常会返回 `{"ok":true,"sent":0}`（还没有到期任务，所以 sent=0 是正常的）。

## 数据安全提醒
- `re_` 的 Resend key 和 `service_role` key 属于**密钥**，不要提交到 GitHub。
- `anon public` key 设计上就是公开的（会内嵌在 app 里），可放心。
- 当前 `tasks` 表为了原型方便未开 RLS；等以后做小组共享时会加上登录鉴权。
