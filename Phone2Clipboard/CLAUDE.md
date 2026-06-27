# CLAUDE.md - Phone2Clipboard

## 项目概述

极简局域网剪贴板同步工具：手机浏览器输入文字 → 笔记本 Windows 剪贴板（Ctrl+V 粘贴）。

- 纯 Node.js 实现，零 npm 依赖
- 局域网仅内网通信，口令保护
- 手机端通过浏览器访问，无需安装 APP

## 文件结构

```
server.js         → 服务端主程序（HTTP + 剪贴板）
mobile.html       → 手机端网页（嵌入式 HTML/CSS/JS）
start.bat         → 一键启动脚本（双击运行）
start-hidden.vbs  → 开机静默自启脚本（可选）
README.md         → 部署操作说明
CLAUDE.md         → Claude Code 项目说明（本文件）
```

## 运行方式

```bash
# 一键启动
start.bat

# 或直接运行
node server.js
```

服务启动后监听 `0.0.0.0:9800`，控制台自动显示局域网 IP 访问地址。

## 配置项

编辑 `server.js` 顶部：

```javascript
const PORT = 9800;        // 服务端口
const TOKEN = "clip2026"; // 访问口令
```

## API 路由

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 手机端网页（需 token） |
| POST | `/submit` | 提交文本写入剪贴板 |
| GET | `/ping` | 健康检查 |
| OPTIONS | `*` | CORS 预检 |

## 技术细节

- 剪贴板写入通过 `child_process.execSync` 调用 PowerShell `Set-Clipboard`
- 口令验证：query 参数 `?token=xxx` 或 Cookie `token=xxx`
- 去重逻辑：MD5 哈希比较，重复内容跳过写入
- 空内容自动过滤（trim 后长度为 0）

## 测试验证结果（2026-06-27）

- ✅ 无口令访问 → 返回登录页
- ✅ 口令正确 → 返回主页面
- ✅ 提交文本 → 剪贴板写入正确（中文+英文）
- ✅ 重复提交 → 跳过（dup: true）
- ✅ 空内容 → 400 拒绝
- ✅ 错误口令 → 403 拒绝

