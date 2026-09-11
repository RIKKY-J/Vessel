import { NextRequest, NextResponse } from "next/server";
import { execPodCommand } from "@/lib/k8s";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { replId, command } = body;

    if (!replId) {
      return NextResponse.json({ error: "replId is required" }, { status: 400 });
    }

    if (!command || typeof command !== "string") {
      return NextResponse.json({ error: "command is required" }, { status: 400 });
    }

    const result = await execPodCommand(replId, command);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("[API /terminal/exec] Error:", error);
    return NextResponse.json(
      {
        stdout: "",
        stderr: error?.message || "Failed to execute command in sandbox pod",
        exitCode: 1,
        error: error?.message,
      },
      { status: 500 }
    );
  }
}
