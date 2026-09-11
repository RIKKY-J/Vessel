# Vessel — In-Browser Cloud IDE & Sandbox Platform

Vessel is a modern, high-performance cloud development environment (IDE) and REPL platform. It enables developers to spin up isolated Kubernetes sandboxes on demand, edit code with Monaco Editor, interact with a low-latency bash terminal, and preview running web applications directly in the browser.

---

## 🚀 Key Features

* **🖥️ Native Interactive Terminal**: Direct typing in `xterm.js` backed by real-time `node-pty` over WebSockets, with dual-mode fallback to Kubernetes API execution (`stdout`, `stderr`, and ANSI color rendering).
* **⚡ Pre-Installed Runtimes & Modules**: Sandboxes come pre-configured with Node.js 20, Python 3, and pre-cached core libraries (`express`, `cors`, `dotenv`) via configured `NODE_PATH`.
* **⚙️ Configurable Run Button**: Split Run control (`[ ▶ Run | ⚙ ]`) with a settings popover to customize start commands per project (e.g. `node --watch index.js`, `npm run dev`, `npx next dev -p 3000`, `python3 main.py`).
* **🌐 Real-Time Web Preview**: Live browser viewport connected to user-run servers on port `3000` with automatic reloading on file update and external tab launching.
* **💻 Monaco Code Editor**: Full-featured code editor with syntax highlighting, file explorer, active tab persistence, and keyboard shortcuts (`Ctrl+Enter` to Run).
* **🔒 Email & Password Authentication**: Secure user management with PBKDF2 password hashing, 12-hour sessions, and a user project management dashboard (`/projects`).
* **☸️ Isolated Kubernetes Sandboxes**: Each project runs in a sandboxed Kubernetes Pod with dedicated CPU/memory limits, ephemeral disk, and ingress routing.
* **☁️ Object Storage Persistence**: Synchronizes workspace files to S3-compatible object storage (AWS S3, Cloudflare R2, MinIO) upon file change or tab exit.
* **🎨 Solid Dark Modern Theme**: Sleek `#0B0D11` background, `#232936` borders, `#E73F1E` flame-red accents, and crisp pure white typography.

---

## 🏗️ Architecture & Workflow

```
┌────────────────────────────────────────────────────────────────────────┐
│                              USER BROWSER                              │
│                                                                        │
│   Landing Page (/)          Auth (/signin)        Projects (/projects) │
│    • Feature overview        • Login / Signup      • View & launch     │
│    • Launch sandbox          • 12-hr session       • Delete projects   │
│                                                                        │
│                       IDE Workspace (/coding)                          │
│    • Monaco Editor           • Live Web Preview (Port 3000)            │
│    • Native Terminal (PTY)   • Split Run Controls (▶ / ⚙)              │
└───────────────────┬──────────────────────────────────┬─────────────────┘
                    │                                  │
    (1) POST /api/project                              │ (3) WebSockets (3001)
        { replId, lang }                               │     & Web Preview (3000)
                    ▼                                  │
┌─────────────────────────────────────────┐            │
│         NEXT.JS 14 APPLICATION          │            │
│                                         │            │
│  • App Router Pages (/, /coding, etc.)  │            │
│  • Auth APIs: /api/auth/{login,signup}  │            │
│  • Sandbox APIs: /api/{start,status}    │            │
│  • Terminal Exec: /api/terminal/exec    │            │
│  • File APIs: /api/file/{save,sync-s3}  │            │
│  • Preview Proxy: /api/preview/[replId] │            │
└─────────────┬─────────────────────┬─────┘            │
              │                     │                  │
    (1) Copies Template             │ (2) Provisions   │
              ▼                     ▼                  ▼
┌───────────────────────┐   ┌────────────────────────────────────────────┐
│    AWS S3 STORAGE     │   │             KUBERNETES CLUSTER             │
│                       │   │                                            │
│ base/{language}/      │   │  Pod: {replId}                             │
│       │               │   │   ├── InitContainer: Pulls S3 to /workspace│
│       ▼               │   │   └── Runner Container (node:20)           │
│ code/{replId}/ ───────┼───┼──────► • WebSocket Server (Port 3001)      │
│                       │   │        • Interactive PTY (node-pty bash)   │
│ users/{email}/        │   │        • User Web Application (Port 3000)  │
└───────────────────────┘   └────────────────────────────────────────────┘
```

---

## 📁 Repository Structure

```
good-code/
├── frontend/                     # Next.js 14 App Router Application
│   ├── src/app/
│   │   ├── page.tsx              # Landing page (features, live demo, launch)
│   │   ├── signin/page.tsx       # Auth page (Email/Password login & signup)
│   │   ├── projects/page.tsx     # User projects dashboard & manager
│   │   ├── coding/page.tsx       # Workspace IDE (Monaco + Terminal + Preview)
│   │   └── api/
│   │       ├── auth/             # PBKDF2 authentication endpoints
│   │       ├── project/          # Project creation and S3 template copier
│   │       ├── start/ & stop/    # Kubernetes pod lifecycle orchestration
│   │       ├── status/           # Real-time pod readiness checker
│   │       ├── terminal/exec/    # Direct fallback container command executor
│   │       ├── file/             # File content, pod write, and S3 sync
│   │       └── preview/          # Web preview proxy route
│   ├── src/components/
│   │   ├── Editor.tsx            # Monaco editor integration
│   │   ├── NativeTerminal.tsx    # Direct interactive xterm.js PTY & exec terminal
│   │   └── Output.tsx            # Live web preview + Run command settings popover
│   └── src/lib/
│       ├── k8s.ts                # Kubernetes API client (Pods, Services, Ingress)
│       └── s3.ts                 # AWS S3 client and user auth store
│
├── runner/                       # Sandbox Daemon (Runs inside Kubernetes pod)
│   ├── Dockerfile                # Runner image build with pre-cached modules
│   ├── src/index.ts              # Express HTTP server & shutdown handlers
│   ├── src/ws.ts                 # Socket.IO WebSocket handlers
│   ├── src/pty.ts                # node-pty pseudo-terminal wrapper for bash
│   └── src/fs.ts                 # Container filesystem operations & sync
│
├── templates/                    # Starter project boilerplate
│   ├── node-js/                  # Node.js starter (index.js, package.json)
│   └── python/                   # Python starter (main.py)
│
└── scripts/                      # Utility scripts
    └── seed-s3.js                # Seed starter templates into S3 bucket
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | Next.js 14 (App Router), React 18, TypeScript |
| **Styling & Icons** | Tailwind CSS, Lucide React, Custom Dark Theme (`#0B0D11`, `#E73F1E`) |
| **Code Editor** | `@monaco-editor/react` with custom `"vessel-dark"` syntax theme |
| **Terminal Viewport** | `xterm.js`, `xterm-addon-fit`, UTF-8 `TextDecoder` |
| **Terminal Daemon** | `node-pty` (`/bin/bash`, `TERM=xterm-256color`) |
| **Real-time Networking**| `socket.io-client` & `socket.io` over WebSockets |
| **Orchestration** | Kubernetes (`@kubernetes/client-node`), AWS EKS, NGINX Ingress |
| **Object Storage** | AWS S3 SDK v2/v3 (Templates, workspaces, user accounts) |

---

## ⚙️ Environment Variables

Create `.env` in the project root or inside `frontend/.env`:

```ini
# AWS / S3 Configuration
S3_BUCKET=your-vessel-bucket
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
S3_ENDPOINT=https://s3.amazonaws.com

# Kubernetes Cluster Configuration (Base64-encoded kubeconfig for cloud/Vercel)
KUBECONFIG_DATA=<base64-encoded-kubeconfig>

# Cluster Ingress Host & Ports
NEXT_PUBLIC_CLUSTER_HOST=100.57.92.214.nip.io:31516
NEXT_PUBLIC_CLUSTER_HTTPS_HOST=100.57.92.214.nip.io:31754

# Optional local overrides:
# NEXT_PUBLIC_RUNNER_WS_URL=ws://localhost:3001
```

---

## 🏃 Getting Started Locally

### 1. Install Frontend Dependencies
```bash
cd frontend
npm install
```

### 2. Seed Starter Templates to S3
Ensure your S3 bucket has the starter templates uploaded:
```bash
node ../scripts/seed-s3.js
```
Or manually verify the bucket contains:
```
your-bucket/
  └── base/
       ├── node-js/     # package.json, index.js
       └── python/      # main.py
```

### 3. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view Vessel.

---

## 💡 Using the Workspace

1. **Sign In / Create Account**:
   - Visit `/signin` and create an account with email and password.
   - You will be redirected to the **Projects Dashboard** (`/projects`).
2. **Launch a Project**:
   - Click **Create Project** or launch an existing project.
   - Vessel provisions an isolated sandbox pod in Kubernetes and mounts workspace files from S3.
3. **Interactive Terminal**:
   - Click into the terminal and type bash commands directly (`ls`, `node -v`, `npm install <pkg>`).
   - Supports arrow-key navigation, tab completion, and ANSI colors.
4. **Configuring the Run Command**:
   - Next to the **▶ Run** button in the preview toolbar, click the **`⚙`** icon.
   - Enter your start command (e.g. `node --watch index.js` or `cd my-app && npx next dev -p 3000`).
   - Press **`Ctrl+Enter`** or click **`▶ Run`** to execute and reload the preview.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
