import { NextRequest, NextResponse } from "next/server";
import {
  copyS3Folder,
  checkS3FolderNotEmpty,
  normalizeLanguage,
  listS3Projects,
  addProjectToUser,
  deleteProjectFromUser,
} from "@/lib/aws";
import { deleteKubeResources } from "@/lib/k8s";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email") || undefined;

    const projects = await listS3Projects(email);
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
    const { replId, language, email } = body;

    if (!replId) {
      return NextResponse.json({ error: "replId is required" }, { status: 400 });
    }

    const normalizedLang = normalizeLanguage(language);
    const existing = await checkS3FolderNotEmpty(`code/${replId}`);

    if (!existing) {
      console.log(`[API /project] Project code/${replId} is new. Initializing with base/${normalizedLang}...`);
      await copyS3Folder(`base/${normalizedLang}`, `code/${replId}`);
    } else {
      console.log(`[API /project] Project code/${replId} already exists in S3. Resuming without overwriting.`);
    }

    // Register project in user's S3 registry if email is provided
    if (email) {
      await addProjectToUser(email, {
        id: replId,
        name: replId,
        language: normalizedLang,
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      message: existing ? "Project resumed" : "Project created",
      replId,
      language: normalizedLang,
      isExisting: existing,
    }, { status: 200 });
  } catch (error: any) {
    console.error("Failed to initialize project in S3:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to initialize project" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let replId = searchParams.get("replId");
    let email = searchParams.get("email");

    if (!replId) {
      const body = await req.json().catch(() => ({}));
      replId = body?.replId;
      email = email || body?.email;
    }

    if (!replId) {
      return NextResponse.json({ error: "replId is required for deletion" }, { status: 400 });
    }

    console.log(`[API /project DELETE] Deleting project ${replId} for user ${email || "anonymous"}`);

    // 1. Delete Kubernetes resources if running
    try {
      await deleteKubeResources(replId);
    } catch (e) {
      console.warn(`[API /project DELETE] K8s delete error:`, e);
    }

    // 2. Delete project from user's S3 registry and remove code/${replId}/ files
    if (email) {
      await deleteProjectFromUser(email, replId);
    } else {
      // Fallback: delete S3 files directly
      await deleteProjectFromUser("default", replId);
    }

    return NextResponse.json({
      message: `Project ${replId} deleted successfully from S3 and cluster`,
      replId,
    }, { status: 200 });
  } catch (error: any) {
    console.error("Failed to delete project:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete project" },
      { status: 500 }
    );
  }
}


