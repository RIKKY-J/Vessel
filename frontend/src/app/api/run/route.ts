import { NextRequest, NextResponse } from "next/server";
import { restartPodApp, writeFileToPod } from "@/lib/k8s";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { replId, path: filePath, content } = body;

    if (!replId) {
      return NextResponse.json({ error: "replId is required" }, { status: 400 });
    }

    // 1. If file content is provided, write it to the pod first
    if (filePath && typeof content === "string") {
      try {
        await writeFileToPod(replId, filePath, content);
      } catch (writeErr) {
        console.warn("[API /run] Warning writing file before restart:", writeErr);
      }
    }

    // 2. Restart user application on port 3000
    const result = await restartPodApp(replId);

    return NextResponse.json({
      success: true,
      replId,
      message: result.message,
    });
  } catch (error: any) {
    console.error("[API /run] Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to restart application" },
      { status: 500 }
    );
  }
}
