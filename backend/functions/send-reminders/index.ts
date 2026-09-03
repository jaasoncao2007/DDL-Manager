// ============================================================
// DDL Manager · send-reminders（云端发信函数）
// 部署位置：Supabase Dashboard → Edge Functions → Create
// 部署后请在 Edge Functions → Secrets 配置：
//   RESEND_API_KEY = re_...（必填）
//   RESEND_FROM    = DDL Manager <onboarding@resend.dev>（可选）
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (_req: Request) => {
  const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
  const RESEND_FROM =
    Deno.env.get("RESEND_FROM") ?? "DDL Manager <onboarding@resend.dev>";

  if (!RESEND_KEY) {
    return json({ ok: false, error: "缺少 RESEND_API_KEY 配置" }, 500);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const now = new Date();
  const nowIso = now.toISOString();
  // 只处理“应提醒时间已到、且不超过 6 小时”的任务，
  // 避免电脑长期未同步后一次性轰炸大量过期邮件。
  const windowStart = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, email, title, course, due_at")
    .eq("done", false)
    .is("notified_at", null)
    .lte("remind_at", nowIso)
    .gte("remind_at", windowStart);

  if (error) {
    return json({ ok: false, error: error.message }, 500);
  }

  let sent = 0;
  const failures: string[] = [];

  for (const t of tasks ?? []) {
    const due = new Date(t.due_at);
    const subject = `⏰ DDL 提醒：${t.title}${t.course ? `（${t.course}）` : ""}`;
    const html = `
      <div style="font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;padding:24px;max-width:520px">
        <h2 style="color:#1a73e8;margin:0 0 16px">⏰ DDL Manager 提醒</h2>
        <p>任务 <b>${esc(t.title)}</b>${t.course ? `（课程：${esc(t.course)}）` : ""} 即将在 <b>${fmt(due)}</b> 截止。</p>
        <p style="color:#666">请记得及时提交作业。</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
        <p style="color:#999;font-size:12px">此邮件由 DDL Manager 自动发送，无需回复。</p>
      </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: RESEND_FROM, to: [t.email], subject, html }),
    });
    const rj = await res.json().catch(() => ({}));

    if (res.ok) {
      await supabase
        .from("tasks")
        .update({ notified_at: nowIso })
        .eq("email", t.email)
        .eq("id", t.id);
      await supabase.from("email_logs").insert({
        email: t.email,
        task_id: t.id,
        subject,
        resend_id: rj.id ?? null,
      });
      sent++;
    } else {
      failures.push(`${t.email}/${t.id}: ${rj.message ?? res.status}`);
    }
  }

  return json({ ok: true, sent, failures });
});

function json(o: unknown, status = 200): Response {
  return new Response(JSON.stringify(o), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function esc(s: string): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}

function fmt(d: Date): string {
  return d.toLocaleString("zh-CN", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}
