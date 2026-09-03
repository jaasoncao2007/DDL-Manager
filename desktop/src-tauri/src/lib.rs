// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// 抓取 Canvas 日历 Feed（.ics 文本）。
/// 由前端自动刷新调用，绕过 WKWebView 的跨域限制。
#[tauri::command]
async fn fetch_feed(url: String) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .user_agent("DDLManager/0.1 (deadline manager)")
        .build()
        .map_err(|e| e.to_string())?;
    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("network: {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("HTTP {}", resp.status()));
    }
    resp.text().await.map_err(|e| format!("read: {e}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, fetch_feed])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
