# 如何打出 Windows (.exe) 版

> 结论：Windows 的 exe **不能在这台 Mac 上直接生成**，
> 需要 Windows 环境。下面两条路任选。

## 方式 A：GitHub Actions 云打包（推荐，免费）
1. 把这个 ddl 文件夹推到 GitHub：
   - 新建一个 GitHub 仓库（Public 或 Private 都行）
   - 终端在 ddl 目录执行：
     git init
     git add -A
     git commit -m "DDL Manager"
     git remote add origin https://github.com/<你的用户名>/<仓库名>.git
     git push -u origin main
2. 推送后，打开仓库页面 → **Actions** → 左侧 **Build Windows (exe)** → 点 **Run workflow**
3. 等 3–8 分钟，跑完后在本次运行的 **Artifacts** 里下载：
   - `DDL-Manager-Windows-NSIS.zip` → 里面是 **setup .exe 安装包**
   - `DDL-Manager-Windows-MSI.zip` → .msi 安装包（若生成）
4. 把 exe 发给别人：双击即可安装。

## 方式 B：在一台 Windows 电脑上本地打包
1. 把 ddl 文件夹拷到 Windows（保留 `desktop/` 结构）
2. 安装：
   - Node.js 20+（https://nodejs.org）
   - Rust（https://rustup.rs，选 MSVC 工具链）
3. 打开 PowerShell，进入 `desktop` 目录：
   npm install
   npm run tauri build
4. 成品在：desktop\src-tauri\target\release\bundle\ 里
   - nsis\*.exe（安装版）
   - msi\*.msi（安装版，若生成）

## 说明
- 图标：Windows 用的 `icon.ico` 已随工程生成，无需处理。
- 功能一致性：Canvas 抓取（Rust 联网）、自动刷新、批量删除、时间轴筛选等全部功能与 Mac 版一致。
- Windows 10/11 自带 WebView2 运行库，一般无需额外安装。
