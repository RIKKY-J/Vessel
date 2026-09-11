import { NextRequest, NextResponse } from "next/server";
import { writeFileToPod } from "@/lib/k8s";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { replId, path: filePath, content } = body;

    if (!replId) {
      return NextResponse.json({ error: "replId is required" }, { status: 400 });
    }

    if (!filePath || typeof filePath !== "string") {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    const fileContent = typeof content === "string" ? content : "";
    const result = await writeFileToPod(replId, filePath, fileContent);

    return NextResponse.json(
      {
        success: true,
        replId,
        path: result.path,
        bytesWritten: result.bytesWritten,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[API /file/write-pod] Error:", error?.message || error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to write file to container",
      },
      { status: 500 }
    );
  }
}
