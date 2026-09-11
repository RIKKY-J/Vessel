import { NextRequest, NextResponse } from "next/server";
import { S3 } from "aws-sdk";
import { normalizeLanguage } from "@/lib/aws";

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
    const filePath = searchParams.get("path");
    const lang = searchParams.get("lang") || "node-js";

    if (!replId || !filePath) {
      return NextResponse.json({ error: "replId and path are required" }, { status: 400 });
    }

    const s3 = getS3Client();
    const bucket = process.env.S3_BUCKET || "s3-podforge";
    const cleanPath = filePath.replace(/^\/+/, "");

    // 1. Try reading from project code folder
    try {
      const obj = await s3
        .getObject({
          Bucket: bucket,
          Key: `code/${replId}/${cleanPath}`,
        })
        .promise();

      if (obj.Body) {
        return NextResponse.json({
          path: filePath,
          content: obj.Body.toString("utf-8"),
          source: "code",
        });
      }
    } catch (e: any) {
      // If file not in code/, try base template
    }

    // 2. Fallback to base template
    const normalizedLang = normalizeLanguage(lang);
    try {
      const baseObj = await s3
        .getObject({
          Bucket: bucket,
          Key: `base/${normalizedLang}/${cleanPath}`,
        })
        .promise();

      if (baseObj.Body) {
        return NextResponse.json({
          path: filePath,
          content: baseObj.Body.toString("utf-8"),
          source: "base",
        });
      }
    } catch (baseErr) {
      // Not in base either
    }

    return NextResponse.json({
      path: filePath,
      content: "",
      source: "empty",
    });
  } catch (error: any) {
    console.error("[API /file/content] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to read file", content: "" },
      { status: 500 }
    );
  }
}
