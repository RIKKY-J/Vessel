import { NextRequest, NextResponse } from "next/server";
import { S3 } from "aws-sdk";
import { normalizeLanguage, copyS3Folder } from "@/lib/aws";

export const dynamic = "force-dynamic";

function getS3Client(): S3 {
  return new S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    endpoint: process.env.S3_ENDPOINT,
    s3ForcePathStyle: true,
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const replId = searchParams.get("replId");
    const langParam = searchParams.get("lang") || searchParams.get("language") || "node-js";

    if (!replId) {
      return NextResponse.json({ error: "replId query parameter is required" }, { status: 400 });
    }

    const s3 = getS3Client();
    const bucket = process.env.S3_BUCKET || "s3-podforge";
    const cleanPrefix = `code/${replId}`;

    let list = await s3.listObjectsV2({ Bucket: bucket, Prefix: `${cleanPrefix}/` }).promise();

    // If no files found under code/${replId}, populate from base template
    if (!list.Contents || list.Contents.length === 0) {
      const normalizedLang = normalizeLanguage(langParam);
      console.log(`[API /project/files] code/${replId} empty. Initializing from base/${normalizedLang}...`);
      try {
        await copyS3Folder(`base/${normalizedLang}`, cleanPrefix);
        list = await s3.listObjectsV2({ Bucket: bucket, Prefix: `${cleanPrefix}/` }).promise();
      } catch (copyErr) {
        console.warn("[API /project/files] Error copying base template:", copyErr);
      }
    }

    const files: Array<{ type: "file" | "dir"; name: string; path: string; content?: string }> = [];

    await Promise.all(
      (list.Contents || []).map(async (item) => {
        if (!item.Key) return;
        const relPath = item.Key.slice(`${cleanPrefix}/`.length);
        if (!relPath) return;

        const fileName = relPath.split("/").pop() || relPath;
        let fileContent = "";

        // Fetch content for text files under 250KB for instant preloading
        if (item.Size && item.Size < 250000) {
          try {
            const obj = await s3.getObject({ Bucket: bucket, Key: item.Key }).promise();
            if (obj.Body) {
              fileContent = obj.Body.toString("utf-8");
            }
          } catch (readErr) {
            console.warn(`[API /project/files] Error reading ${item.Key}:`, readErr);
          }
        }

        files.push({
          type: "file",
          name: fileName,
          path: `/${relPath}`,
          content: fileContent,
        });
      })
    );

    // Sort files alphabetically
    files.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      files,
      replId,
      total: files.length,
    }, { status: 200 });
  } catch (error: any) {
    console.error("[API /project/files] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load project files", files: [] },
      { status: 500 }
    );
  }
}
