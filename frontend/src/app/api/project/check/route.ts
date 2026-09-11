import { NextRequest, NextResponse } from "next/server";
import { S3 } from "aws-sdk";

export const dynamic = "force-dynamic";

function getS3Client(): S3 {
  return new S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.AWS_REGION || "us-east-1",
    s3ForcePathStyle: true,
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const replId = searchParams.get("replId");

    if (!replId) {
      return NextResponse.json({ error: "replId is required" }, { status: 400 });
    }

    const s3 = getS3Client();
    const bucket = process.env.S3_BUCKET || "s3-podforge";
    const prefix = `code/${replId}/`;

    const list = await s3.listObjectsV2({ Bucket: bucket, Prefix: prefix, MaxKeys: 20 }).promise();
    const contents = list.Contents || [];

    if (contents.length === 0) {
      return NextResponse.json({ exists: false, replId });
    }

    // Detect language from existing files
    let detectedLang = "node-js";
    const filenames = contents.map((c) => (c.Key ? c.Key.replace(prefix, "") : ""));

    if (filenames.some((f) => f === "main.py" || f.endsWith(".py"))) {
      detectedLang = "python";
    } else if (filenames.some((f) => f === "package.json" || f.endsWith(".js") || f.endsWith(".ts"))) {
      detectedLang = "node-js";
    }

    return NextResponse.json({
      exists: true,
      replId,
      language: detectedLang,
      filesCount: contents.length,
      files: filenames,
    });
  } catch (error: any) {
    console.error("[API /project/check] Error checking project existence:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to check project" },
      { status: 500 }
    );
  }
}
