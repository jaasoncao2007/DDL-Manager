-- ============================================================
-- DDL Manager · Supabase 数据库结构
-- 使用方法：Supabase Dashboard → SQL Editor → New query
--           → 粘贴本文件全部内容 → Run
-- ============================================================

-- 1) 任务表：app 端同步上来的、需要被提醒的任务
create table if not exists public.tasks (
  email       text        not null,          -- 接收提醒的邮箱
  id          text        not null,          -- app 内部的任务 id
  title       text        not null,          -- 任务标题
  course      text        default '',        -- 课程
  due_at      timestamptz not null,          -- 截止时间（UTC）
  done        boolean     not null default false, -- 是否已完成
  remind_at   timestamptz,                   -- 应发提醒的时间 = due_at - 提前量
  notified_at timestamptz,                   -- 实际发送时间（用于去重）
  updated_at  timestamptz not null default now(),
  primary key (email, id)
);

-- 加快“该提醒哪些任务”的查询
create index if not exists idx_tasks_remind
  on public.tasks (done, remind_at)
  where done = false;

-- 2) 发送日志：每次发信记一条，方便日后排查
create table if not exists public.email_logs (
  id         bigint generated always as identity primary key,
  email      text not null,
  task_id    text not null,
  subject    text,
  resend_id  text,
  sent_at    timestamptz not null default now()
);

-- 3) 定时任务：每 30 分钟调用一次云端发信函数 send-reminders
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 先删除旧的同名任务，避免重复创建报错
select cron.unschedule('ddl-email-reminders')
where exists (select 1 from cron.job where jobname = 'ddl-email-reminders');

-- 注册定时任务（每 30 分钟整点触发）
select cron.schedule(
  'ddl-email-reminders',          -- 任务名
  '*/30 * * * *',                 -- cron 表达式：每 30 分钟
  $$
  select net.http_post(
    url     := 'https://bjymopyldecqtyerqfxh.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqeW1vcHlsZGVjcXR5ZXJxZnhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NjI0NjIsImV4cCI6MjEwNDAzODQ2Mn0.AG1ijIxe5QIWSJusqANE-hmHBG7YfVkuklP91A5ONmU',
      'Content-Type',  'application/json'
    ),
    body    := '{}'::jsonb
  );
  $$
);
