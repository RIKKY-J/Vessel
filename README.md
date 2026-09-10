# PodForge — In-Browser Cloud IDE & Sandbox

A cloud-based interactive development environment (IDE) and REPL platform. It enables users to create a project in their browser, spin up an isolated Kubernetes container on-demand, edit code via Monaco Editor, execute commands in an interactive bash terminal over WebSockets, and preview live web applications.

---

## 🚀 Key Features

* **⚡ Unified Next.js 14 App Router**: Clean, modern architecture consolidating the frontend UI, S3 project initialization, and Kubernetes pod orchestration into a single Next.js application.
* **💻 Monaco Code Editor**: Full-featured in-browser code editor with syntax highlighting, automatic layout, and file-tree exploration.
* **🖥️ Interactive PTY Terminal**: Low-latency pseudo-terminal (`/bin/bash`) streaming bi-directionally over WebSockets powered by `xterm.js` and `node-pty`.
* **🌐 Live Web Preview**: Real-time iframe preview connected to user-run servers inside their sandbox on port `3000`.
* **☸️ Kubernetes Sandboxes**: Each REPL session is provisioned as an isolated Kubernetes Pod with dedicated resource limits and an emptyDir workspace.
* **☁️ Object Storage Persistence**: Boilerplate templates and project files are synchronized with AWS S3 (or S3-compatible alternatives like Cloudflare R2 or MinIO).

---

## 🏗️ Architecture & Workflow

```
┌────────────────────────────────────────────────────────────────────────┐
│                              USER BROWSER                              │
│                                                                        │
│   Landing Page (/)                          Coding Workspace (/coding) │
│    - Select Language (Node/Python)           - Monaco Code Editor      │
│    - Generate / Enter replId                 - XTerm.js Terminal       │
│                                              - Web Preview Iframe      │
└───────────────────┬──────────────────────────────────┬─────────────────┘
                    │                                  │
    (1) POST /api/project                              │ (3) WebSockets (3001)
        { replId, lang }                               │     & Web Preview (3000)
                    ▼                                  │
┌─────────────────────────────────────────┐            │
│         NEXT.JS 14 APPLICATION          │            │
│                                         │            │
│  • UI Routes (/ & /coding)              │            │
│  • API: /api/project (S3 init)          │            │
│  • API: /api/start (K8s orchestrator)   │            │
└─────────────┬─────────────────────┬─────┘            │
              │                     │                  │
    (1) Copies Template             │ (2) POST /api/start
              ▼                     ▼                  ▼
┌───────────────────────┐   ┌────────────────────────────────────────────┐
│    AWS S3 STORAGE     │   │             KUBERNETES CLUSTER             │
│                       │   │                                            │
│ base/{language}/      │   │  Pod: replId                               │
│       │               │   │   ├── InitContainer: Pulls S3 to /workspace│
│       ▼               │   │   └── Runner Container (100xdevs/runner)   │
│ code/{replId}/ ───────┼───┼──────► • WebSocket Server (Port 3001)      │
│                       │   │        • Terminal Daemon (node-pty)        │
│                       │   │        • User Web App (Port 3000)          │
└───────────────────────┘   └────────────────────────────────────────────┘
```

---

## 📁 Repository Structure

```
good-code/
├── frontend/               # Next.js 14 App Router Application
│   ├── src/app/
│   │   ├── page.tsx        # Landing page (runtime selection & slug generator)
│   │   ├── coding/page.tsx # IDE workspace (Monaco + Terminal + Preview)
│   │   ├── api/project/    # API Route: initializes project files in S3
│   │   └── api/start/      # API Route: provisions K8s pod, service, ingress
│   ├── src/components/     # Monaco Editor, XTerm Terminal, Output Preview
│   └── src/lib/            # AWS S3 and Kubernetes client helpers
│
├── runner/                 # Sandboxed Container Daemon (Runs inside K8s pod)
│   ├── Dockerfile          # Builds the runner container (node:20)
│   ├── src/ws.ts           # Socket.IO handlers for file sync and terminal
│   ├── src/pty.ts          # node-pty pseudo-terminal wrapper for bash
│   └── src/fs.ts           # Container file system operations
│
├── k8s/                    # Cluster Configuration
│   └── ingress-controller.yaml # NGINX Ingress Controller manifest
│
├── init-service/           # [Legacy reference - now unified into Next.js /api/project]
└── orchestrator-simple/    # [Legacy reference - now unified into Next.js /api/start]
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend UI** | Next.js 14, React 18, TypeScript, Tailwind CSS, Lucide Icons |
| **Editor & Shell** | `@monaco-editor/react`, `xterm.js`, `xterm-addon-fit` |
| **Real-time Comms** | `socket.io-client` & `socket.io` |
| **Server APIs** | Next.js Route Handlers (`/api/project`, `/api/start`) |
| **Sandboxed Runner**| Node.js 20, Express, `node-pty`, Docker |
| **Orchestration** | Kubernetes (`@kubernetes/client-node`), NGINX Ingress |
| **Object Storage** | AWS S3 |

---

## ⚙️ Environment Variables & Setup

### 1. Object Storage (S3 / R2 / MinIO) Configuration
Create `frontend/.env.local` (see `frontend/.env.example`):
```ini
S3_BUCKET=your-s3-bucket-name
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
S3_ENDPOINT=https://s3.amazonaws.com
# Optional: Set custom runner WebSocket URL for local testing
# NEXT_PUBLIC_RUNNER_WS_URL=ws://localhost:3001
```

Also set the same S3 credentials in `runner/.env`:
```ini
S3_BUCKET=your-s3-bucket-name
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
S3_ENDPOINT=https://s3.amazonaws.com
```

### 2. S3 Bucket Folder Structure
Before launching workspaces, ensure your S3 bucket has starter templates:
```
your-s3-bucket-name/
  └── base/
       ├── node-js/     # Starter package.json, index.js
       └── python/      # Starter main.py, requirements.txt
```

### 3. Kubernetes Setup
* Make sure you have a working Kubernetes cluster (e.g. Minikube, Kind, Docker Desktop, or managed EKS/GKE).
* Ensure `~/.kube/config` is configured with permissions to create Deployments, Services, and Ingresses in the `default` namespace.
* Install the NGINX Ingress controller:
  ```bash
  kubectl apply -f k8s/ingress-controller.yaml
  ```

---

## 🏃 Running Locally

### Step 1: Run the Next.js App
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the landing page.

### Step 2: Build the Runner Docker Image
Inside `runner/`:
```bash
cd runner
docker build -t 100xdevs/runner:latest .
```
*(If testing on Minikube or Kind, load the image into your cluster using `minikube image load 100xdevs/runner:latest` or `kind load docker-image 100xdevs/runner:latest`).*

### Step 3: Test a REPL Session
1. Navigate to `http://localhost:3000`.
2. Choose **Node.js** or **Python** runtime.
3. Click **Launch Environment**.
4. The workspace will initialize the S3 folder, provision the pod, and open the Monaco Editor and bash terminal.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
