const express = require("express");
const app = express();
const port = 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>PodForge - Node.js Sandbox</title>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background: #0f172a;
          color: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          padding: 1.5rem;
        }
        .card {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 1rem;
          padding: 2.5rem;
          max-width: 520px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          text-align: center;
        }
        h1 { color: #38bdf8; margin-top: 0; font-size: 1.85rem; font-weight: 800; }
        p { color: #94a3b8; line-height: 1.6; font-size: 0.95rem; }
        .badge {
          display: inline-block;
          background: rgba(56, 189, 248, 0.15);
          border: 1px solid rgba(56, 189, 248, 0.3);
          color: #38bdf8;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.35rem 0.85rem;
          border-radius: 9999px;
          margin-bottom: 1.25rem;
        }
        code {
          background: #0f172a;
          color: #f43f5e;
          padding: 0.2rem 0.45rem;
          border-radius: 0.375rem;
          font-size: 0.9em;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }
        .footer {
          margin-top: 1.75rem;
          padding-top: 1.25rem;
          border-top: 1px solid #334155;
          font-size: 0.8rem;
          color: #64748b;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <span class="badge">Node.js v20 Sandbox</span>
        <h1>Welcome to PodForge!</h1>
        <p>Your Node.js web server is live and serving traffic on port <code>3000</code>.</p>
        <p>Edit <code>index.js</code> in the editor on the left to customize this application.</p>
        <div class="footer">
          PodForge In-Browser Cloud IDE & Sandbox
        </div>
      </div>
    </body>
    </html>
  `);
});

app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString(), runtime: "node-js" });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on http://0.0.0.0:${port}`);
});
