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
    const combinedOutput = [result.stdout, result.stderr].filter(Boolean).join("") || "";
    return NextResponse.json(
      {
        stdout: result.stdout || "",
        stderr: result.stderr || "",
        exitCode: result.exitCode ?? 0,
        output: combinedOutput,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[API /terminal/exec] Error:", error);
    const errMsg = error?.message || "Failed to execute command in sandbox pod";
    return NextResponse.json(
      {
        stdout: "",
        stderr: errMsg,
        exitCode: 1,
        error: errMsg,
        output: `Error: ${errMsg}\n`,
      },
      { status: 500 }
    );
  }
}

