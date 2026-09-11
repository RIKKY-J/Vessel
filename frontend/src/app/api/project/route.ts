import { NextRequest, NextResponse } from "next/server";
import { copyS3Folder, checkS3FolderNotEmpty, normalizeLanguage, listS3Projects } from "@/lib/aws";

export async function GET() {
  try {
    const projects = await listS3Projects();
    return NextResponse.json({ projects }, { status: 200 });
  } catch (error: any) {
    console.error("Failed to list projects from S3:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to list projects", projects: [] },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { replId, language } = body;

    if (!replId) {
      return NextResponse.json({ error: "replId is required" }, { status: 400 });
    }

    const normalizedLang = normalizeLanguage(language);
    const existing = await checkS3FolderNotEmpty(`code/${replId}`);

    if (existing) {
      console.log(`[API /project] Project code/${replId} already exists in S3. Resuming without overwriting.`);
      return NextResponse.json({
        message: "Project resumed",
        replId,
        language: normalizedLang,
        isExisting: true,
      }, { status: 200 });
    }

    console.log(`[API /project] Project code/${replId} is new. Initializing with base/${normalizedLang}...`);
    await copyS3Folder(`base/${normalizedLang}`, `code/${replId}`);

    return NextResponse.json({
      message: "Project created",
      replId,
      language: normalizedLang,
      isExisting: false,
    }, { status: 200 });
  } catch (error: any) {
    console.error("Failed to initialize project in S3:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to initialize project" },
      { status: 500 }
    );
  }
}

