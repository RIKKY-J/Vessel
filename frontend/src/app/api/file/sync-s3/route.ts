import { NextRequest, NextResponse } from "next/server";
import { saveToS3 } from "@/lib/aws";

export const dynamic = "force-dynamic";

interface FileEntry {
  path: string;
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { replId, files, path: singlePath, content: singleContent } = body;

    if (!replId) {
      return NextResponse.json({ error: "replId is required" }, { status: 400 });
    }

    const itemsToSave: FileEntry[] = [];

    if (Array.isArray(files) && files.length > 0) {
      for (const item of files) {
        if (item && item.path) {
          itemsToSave.push({
            path: item.path.replace(/^\/+/, ""),
            content: typeof item.content === "string" ? item.content : "",
          });
        }
      }
    } else if (singlePath) {
      itemsToSave.push({
        path: singlePath.replace(/^\/+/, ""),
        content: typeof singleContent === "string" ? singleContent : "",
      });
    }

    if (itemsToSave.length === 0) {
      return NextResponse.json({ success: true, message: "No files to persist", count: 0 });
    }

    console.log(`[API /file/sync-s3] Persisting ${itemsToSave.length} files to S3 for replId=${replId}`);

    const savePromises = itemsToSave.map(async (file) => {
      await saveToS3(`code/${replId}`, file.path, file.content);
      return file.path;
    });

    const savedPaths = await Promise.all(savePromises);

    console.log(`[API /file/sync-s3] Successfully synced ${savedPaths.length} files to s3://code/${replId}/`);

    return NextResponse.json({
      success: true,
      replId,
      syncedFiles: savedPaths,
      count: savedPaths.length,
    });
  } catch (error: any) {
    console.error("[API /file/sync-s3] Error persisting files to S3:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to persist files to S3",
      },
      { status: 500 }
    );
  }
}
