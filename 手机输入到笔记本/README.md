# 📱→💻 Phone2Clipboard

A minimal LAN clipboard sync tool. Type on your phone, paste on your laptop with `Ctrl+V`.

> Zero dependencies. LAN only. No app install needed — just a browser.

## How It Works

```
Phone (browser) ──WiFi──> Laptop (Node.js server) ──> Windows Clipboard
```

1. Run `start.bat` on your Windows laptop
2. Connect your phone to the same WiFi
3. Open the displayed URL in your phone browser
4. Type or paste text → hit **Send**
5. Press `Ctrl+V` on your laptop — done!

## Features

- **Zero npm dependencies** — pure Node.js, nothing to install
- **LAN-only** — no internet required, all data stays on your network
- **Token protection** — simple access code prevents unauthorized use
- **Smart dedup** — identical content won't re-flush the clipboard
- **Empty filter** — blank submissions are silently ignored
- **Mobile-first UI** — dark theme, char count, send history, `Ctrl+Enter` shortcut
- **Background-friendly** — runs silently, low resource usage
- **Auto-start optional** — VBS wrapper + Task Scheduler support

## Quick Start

### Prerequisites

- Windows 10/11
- [Node.js](https://nodejs.org/) 16 or later
- Phone and laptop on the same WiFi network

### Run

```bash
# Double-click start.bat, or:
node server.js
```

The console will print your LAN IP:

```
📱 Open on your phone:
   http://192.168.x.x:9800/?token=clip2026
```

Open that URL on your phone and start typing.

## Configuration

Edit the top of `server.js`:

```javascript
const PORT = 9800;        // server port
const TOKEN = "clip2026"; // access code (change this!)
```

## Project Structure

```
├── server.js         # Backend server (HTTP + clipboard)
├── mobile.html       # Mobile web page (dark UI)
├── start.bat         # One-click launch script
├── start-hidden.vbs  # Silent auto-start script (optional)
├── README.md         # This file
└── CLAUDE.md         # Claude Code project context
```

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Mobile web page (requires token) |
| `POST` | `/submit` | Submit text → writes to clipboard |
| `GET` | `/ping` | Health check |

## Auto-Start on Boot (Optional)

**Option A — Startup folder**

1. Press `Win+R`, type `shell:startup`, press Enter
2. Place a shortcut to `start-hidden.vbs` in that folder

**Option B — Task Scheduler**

```powershell
$action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"C:\path\to\start-hidden.vbs`""
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName "Phone2Clipboard" -Action $action -Trigger $trigger -Settings $settings
```

## Security

- Listens on LAN IP only — not accessible from the internet
- Token-based access prevents random people on your WiFi from connecting
- No data is written to disk; everything lives in memory and the system clipboard
- Change the default token to something unique for your setup

## Roadmap

- [ ] Bidirectional sync (laptop clipboard → phone)
- [ ] File / image transfer
- [ ] HTTPS with self-signed cert
- [ ] Server-side history persistence

## License

MIT
