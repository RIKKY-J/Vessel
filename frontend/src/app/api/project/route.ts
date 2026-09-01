import { NextRequest, NextResponse } from "next/server";
import { copyS3Folder } from "@/lib/aws";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { replId, language } = body;

    if (!replId || !language) {
      return NextResponse.json({ error: "replId and language are required" }, { status: 400 });
    }

    await copyS3Folder(`base/${language}`, `code/${replId}`);

    return NextResponse.json({ message: "Project created", replId, language }, { status: 200 });
  } catch (error: any) {
    console.error("Failed to initialize project in S3:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to initialize project" },
      { status: 500 }
    );
  }
}
