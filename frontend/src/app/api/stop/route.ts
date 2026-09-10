import { NextRequest, NextResponse } from "next/server";
import { deleteKubeResources } from "@/lib/k8s";

export async function POST(req: NextRequest) {
  try {
    let replId: string | undefined;

    // Handle both regular JSON fetch and navigator.sendBeacon
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json") || contentType.includes("text/plain")) {
      try {
        const body = await req.json();
        replId = body?.replId;
      } catch {
        const text = await req.text();
        try {
          const parsed = JSON.parse(text);
          replId = parsed?.replId;
        } catch {
          replId = undefined;
        }
      }
    } else {
      const body = await req.json().catch(() => ({}));
      replId = body?.replId;
    }

    if (!replId) {
      return NextResponse.json({ error: "replId is required" }, { status: 400 });
    }

    console.log(`[API /stop] Stopping sandbox and releasing Kubernetes resources for replId=${replId}`);
    const details = await deleteKubeResources(replId);

    return NextResponse.json(
      { message: "Project sandbox terminated and resources released successfully", replId, details },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[API /stop] Error stopping K8s resources:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to stop project resources" },
      { status: 500 }
    );
  }
}
