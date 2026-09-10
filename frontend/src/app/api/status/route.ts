import { NextRequest, NextResponse } from "next/server";
import { getPodStatus } from "@/lib/k8s";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const replId = searchParams.get("replId");

    if (!replId) {
      return NextResponse.json({ error: "replId query param is required" }, { status: 400 });
    }

    const status = await getPodStatus(replId);
    return NextResponse.json(status, { status: 200 });
  } catch (error: any) {
    console.error("[API /status] Error:", error);
    return NextResponse.json(
      { ready: false, phase: "Unknown", statusText: "Checking status...", error: error?.message },
      { status: 500 }
    );
  }
}
