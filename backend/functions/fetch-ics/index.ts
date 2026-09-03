// ============================================================
// DDL Manager · fetch-ics（网页版跨域抓取转发）
// 部署位置：Supabase Dashboard → Edge Functions → Create
// 名称：fetch-ics → 粘贴本文件 → Deploy
// 用途：网页/手机版因浏览器 CORS 限制无法直接抓 Canvas Feed，
//       由本函数在云端代为抓取（feed token 只经过你自己的 Supabase）
// ============================================================
Deno.serve(async (req: Request) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { url } = await req.json();
    let u: URL;
    try {
      u = new URL(String(url || "").trim().replace(/^webcal:\/\//i, "https://"));
    } catch {
      return json({ ok: false, error: "链接格式不正确" }, 400, cors);
    }
    if (u.protocol !== "https:") {
      return json({ ok: false, error: "仅允许 https 地址" }, 400, cors);
    }
    // 安全限制：只允许抓取自己的学校 Canvas / Instructure 日历，避免被当公共代理滥用
    const host = u.hostname.toLowerCase();
    const allowed =
      host === "canvas.illinois.edu" ||
      host.endsWith(".canvas.illinois.edu") ||
      host.endsWith(".instructure.com") ||
      host.endsWith(".illinois.edu");
    if (!allowed) {
      return json({ ok: false, error: "域名不在允许列表内" }, 403, cors);
    }

    const res = await fetch(u.toString(), {
      headers: { "User-Agent": "DDLManager-web/1.0 (+https://github.com/jaasoncao2007/DDL-Manager)" },
    });
    if (!res.ok) return json({ ok: false, error: "HTTP " + res.status }, 502, cors);
    const text = await res.text();
    if (!/BEGIN:VCALENDAR/i.test(text)) {
      return json({ ok: false, error: "返回内容不是有效的 ICS" }, 502, cors);
    }
    return json({ ok: true, text }, 200, cors);
  } catch (e) {
    return json({ ok: false, error: String((e && e.message) || e) }, 500, cors);
  }
});

function json(o: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(o), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}
