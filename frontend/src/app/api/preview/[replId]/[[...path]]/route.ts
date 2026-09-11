import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function handleProxy(
  req: NextRequest,
  { params }: { params: { replId: string; path?: string[] } }
) {
  const replId = params.replId;
  if (!replId) {
    return NextResponse.json({ error: "replId is required" }, { status: 400 });
  }

  const subpath = params.path && params.path.length > 0 ? `/${params.path.join("/")}` : "/";
  const { search } = new URL(req.url);

  // Cluster host configuration
  const clusterHost = process.env.NEXT_PUBLIC_CLUSTER_HOST || "100.57.92.214.nip.io:31516";
  const targetUrl = `http://${replId}-app.${clusterHost}${subpath}${search}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    // Filter headers to forward
    const forwardHeaders: Record<string, string> = {
      Accept: req.headers.get("accept") || "*/*",
      "User-Agent": req.headers.get("user-agent") || "Vessel-Preview-Proxy",
    };

    const contentType = req.headers.get("content-type");
    if (contentType) forwardHeaders["Content-Type"] = contentType;

    let body: any = null;
    if (req.method !== "GET" && req.method !== "HEAD") {
      body = await req.blob();
    }

    const res = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body,
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeout);

    const resContentType = res.headers.get("content-type") || "";

    // If HTML, inject <base> tag to correctly route relative assets through this proxy
    if (resContentType.includes("text/html")) {
      let html = await res.text();
      const baseTag = `<base href="/api/preview/${encodeURIComponent(replId)}/">`;
      if (html.includes("<head>")) {
        html = html.replace("<head>", `<head>\n  ${baseTag}`);
      } else if (html.includes("<head ")) {
        html = html.replace(/<head[^>]*>/, `$& \n  ${baseTag}`);
      } else {
        html = `${baseTag}\n${html}`;
      }

      return new NextResponse(html, {
        status: res.status,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    // Binary / non-HTML assets (CSS, JS, images, API JSON)
    const data = await res.arrayBuffer();
    const responseHeaders: Record<string, string> = {
      "Content-Type": resContentType,
      "Cache-Control": "no-store",
    };

    return new NextResponse(data, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    // Return a clean in-IDE status page when the user's web server has not started yet
    const errorHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vessel Sandbox - Web Server Offline</title>
        <style>
          body {
            margin: 0;
            padding: 2rem;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #092328;
            color: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            box-sizing: border-box;
          }
          .card {
            background: #12544F33;
            border: 1px solid #12544F;
            border-radius: 12px;
            padding: 2rem;
            max-width: 480px;
            text-align: center;
            box-shadow: 0 10px 25px rgba(0,0,0,0.3);
          }
          .badge {
            display: inline-block;
            background: #2A835F26;
            color: #8BBB92;
            border: 1px solid #2A835F55;
            padding: 4px 12px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 600;
            margin-bottom: 1rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          h2 { margin: 0 0 0.5rem; color: #f8fafc; font-size: 1.25rem; }
          p { color: #8BBB92bb; font-size: 0.875rem; line-height: 1.5; margin: 0 0 1.25rem; }
          code {
            display: block;
            background: #06191c;
            border: 1px solid #12544F;
            border-radius: 6px;
            padding: 0.6rem;
            font-family: monospace;
            font-size: 0.8rem;
            color: #8BBB92;
            margin-bottom: 1rem;
          }
          .btn {
            display: inline-block;
            background: #2A835F;
            color: white;
            padding: 6px 16px;
            border-radius: 6px;
            font-size: 0.8rem;
            text-decoration: none;
            cursor: pointer;
          }
          .btn:hover { background: #359f73; }
        </style>
      </head>
      <body>
        <div class="card">
          <span class="badge">Web Preview Standby</span>
          <h2>Application Server Not Running</h2>
          <p>Your sandbox is active, but nothing is currently listening on port 3000.</p>
          <p style="font-size: 12px; color: #8BBB92;">Run your application in the terminal below:</p>
          <code>node index.js &</code>
          <p style="font-size: 11px; margin-bottom: 0;">Once your server starts listening, click the refresh button above.</p>
        </div>
      </body>
      </html>
    `;

    return new NextResponse(errorHtml, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

export async function GET(req: NextRequest, ctx: { params: { replId: string; path?: string[] } }) {
  return handleProxy(req, ctx);
}

export async function POST(req: NextRequest, ctx: { params: { replId: string; path?: string[] } }) {
  return handleProxy(req, ctx);
}

export async function PUT(req: NextRequest, ctx: { params: { replId: string; path?: string[] } }) {
  return handleProxy(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: { params: { replId: string; path?: string[] } }) {
  return handleProxy(req, ctx);
}
