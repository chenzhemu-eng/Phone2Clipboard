// ============================================================
//  手机输入到笔记本 - 局域网剪贴板同步服务端
//  纯 Node.js 实现，零依赖
//  功能：手机浏览器输入文字 → 实时写入 Windows 剪贴板
// ============================================================

const http = require("http");
const { execSync } = require("child_process");
const os = require("os");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ── 配置项 ──────────────────────────────────────────────────
const PORT = 9800;                           // 服务端口
const TOKEN = "clip2026";                    // 访问口令（可自行修改）
const MAX_BODY = 50 * 1024;                  // 最大请求体 50KB
// ────────────────────────────────────────────────────────────

// 状态追踪
let lastClipboard = "";   // 上一次写入的内容，用于去重
let requestCount = 0;     // 请求计数器

// ── 工具函数 ────────────────────────────────────────────────

/** 获取本机局域网 IPv4 地址列表 */
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const [name, addrs] of Object.entries(interfaces)) {
    for (const addr of addrs) {
      if (addr.family === "IPv4" && !addr.internal) {
        ips.push({ name, address: addr.address });
      }
    }
  }
  return ips;
}

/** 写入 Windows 系统剪贴板（通过 PowerShell） */
function setClipboard(text) {
  // 转义 PowerShell 特殊字符，防止注入
  const escaped = text.replace(/"/g, '`"').replace(/\$/g, '`$');
  // 使用 UTF-8 编码确保中文正常
  execSync(
    `powershell -NoProfile -Command "[Console]::OutputEncoding=[Text.Encoding]::UTF8; Set-Clipboard -Value '${escaped}'"`,
    { encoding: "utf-8", windowsHide: true }
  );
}

/** 计算内容哈希用于去重比较 */
function contentHash(str) {
  return crypto.createHash("md5").update(str, "utf8").digest("hex");
}

/** 统一 HTTP 响应 */
function respond(res, status, obj) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(obj));
}

/** 读取并返回手机端网页 */
function getMobilePage() {
  const filePath = path.join(__dirname, "mobile.html");
  return fs.readFileSync(filePath, "utf-8");
}

/** 从请求中提取 cookie 里的 token */
function getTokenFromCookies(cookieHeader) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/token=([^;]+)/);
  return match ? match[1] : null;
}

// ── 读取手机端网页（缓存） ──────────────────────────────────
let mobileHTML = "";
try {
  mobileHTML = getMobilePage();
} catch (e) {
  console.error("❌ 未找到 mobile.html，请确保文件存在");
  process.exit(1);
}

// ── HTTP 服务 ───────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // CORS 预检
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  // ── 路由：首页（手机端网页） ──
  if (req.method === "GET" && url.pathname === "/") {
    // 检查口令：query 参数或 cookie
    const tokenParam = url.searchParams.get("token");
    const tokenCookie = getTokenFromCookies(req.headers.cookie);
    const token = tokenParam || tokenCookie;

    if (token === TOKEN) {
      // 口令正确，返回页面并设置 cookie（24h 有效）
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Set-Cookie": `token=${TOKEN}; Path=/; Max-Age=86400; SameSite=Strict`,
      });
      res.end(mobileHTML);
    } else {
      // 口令错误或缺失，返回登录页
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>输入口令</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0a0a0a;color:#e0e0e0}.box{background:#1a1a1a;border-radius:16px;padding:32px;width:90%;max-width:360px;box-shadow:0 8px 32px rgba(0,0,0,.4)}h2{font-size:20px;margin-bottom:20px;text-align:center;color:#fff}input{width:100%;padding:14px;border:1px solid #333;border-radius:10px;background:#111;color:#fff;font-size:16px;outline:none;text-align:center;letter-spacing:4px}input:focus{border-color:#646cff}button{width:100%;margin-top:16px;padding:14px;border:none;border-radius:10px;background:#646cff;color:#fff;font-size:16px;font-weight:600;cursor:pointer;transition:.2s}button:hover{background:#535bf2}button:active{transform:scale(.98)}.err{color:#ff6b6b;font-size:13px;text-align:center;margin-top:10px;min-height:20px}</style></head><body><div class="box"><h2>🔐 输入访问口令</h2><form method="GET" action="/"><input name="token" type="text" placeholder="请输入口令" autofocus autocomplete="off"><button type="submit">进入</button><div class="err">${tokenParam && tokenParam !== TOKEN ? "口令错误，请重试" : ""}</div></form></div></body></html>`);
    }
    return;
  }

  // ── 路由：提交文本 → 写入剪贴板 ──
  if (req.method === "POST" && url.pathname === "/submit") {
    // 验证口令
    const tokenParam = url.searchParams.get("token");
    const tokenCookie = getTokenFromCookies(req.headers.cookie);
    if ((tokenParam || tokenCookie) !== TOKEN) {
      return respond(res, 403, { ok: false, error: "口令无效" });
    }

    let body = "";
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        respond(res, 413, { ok: false, error: "内容过长" });
        req.destroy();
        return;
      }
      body += chunk.toString("utf-8");
    });

    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        const text = (data.text || "").trim();

        // 过滤空内容
        if (!text) {
          return respond(res, 400, { ok: false, error: "内容为空" });
        }

        // 去重：与上次内容比较
        const hash = contentHash(text);
        const lastHash = contentHash(lastClipboard);
        if (hash === lastHash) {
          return respond(res, 200, {
            ok: true,
            dup: true,
            msg: "内容未变化，已跳过",
          });
        }

        // 写入剪贴板
        setClipboard(text);
        lastClipboard = text;
        requestCount++;

        const timestamp = new Date().toLocaleTimeString("zh-CN", {
          hour12: false,
        });
        console.log(`[${timestamp}] #${requestCount} 已写入剪贴板 (${text.length}字)`);

        respond(res, 200, {
          ok: true,
          msg: "已写入剪贴板",
          len: text.length,
        });
      } catch (e) {
        respond(res, 400, { ok: false, error: "数据格式错误" });
      }
    });

    return;
  }

  // ── 路由：状态查询 ──
  if (req.method === "GET" && url.pathname === "/ping") {
    return respond(res, 200, { ok: true, requests: requestCount });
  }

  // ── 404 ──
  respond(res, 404, { ok: false, error: "未找到" });
});

// ── 启动 ────────────────────────────────────────────────────
server.listen(PORT, "0.0.0.0", () => {
  const ips = getLocalIPs();
  console.log("");
  console.log("  ╔═══════════════════════════════════════════╗");
  console.log("  ║     📱 手机输入到笔记本 · 服务已启动       ║");
  console.log("  ╚═══════════════════════════════════════════╝");
  console.log("");
  console.log(`  端口: ${PORT}`);
  console.log(`  口令: ${TOKEN}`);
  console.log(`  状态: http://127.0.0.1:${PORT}/ping`);
  console.log("");
  if (ips.length === 0) {
    console.log("  ⚠ 未检测到局域网 IP，请检查网络连接");
  } else {
    console.log("  📲 手机浏览器访问：");
    ips.forEach(({ name, address }) => {
      console.log(`     http://${address}:${PORT}/?token=${TOKEN}`);
      console.log(`     (网卡: ${name})`);
    });
  }
  console.log("");
  console.log("  💡 按 Ctrl+C 停止服务");
  console.log("  ─────────────────────────────────────────────");
  console.log("");
});
