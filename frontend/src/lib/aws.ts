import { S3 } from "aws-sdk";

function getS3Client(): S3 {
  return new S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    endpoint: process.env.S3_ENDPOINT,
    s3ForcePathStyle: true,
  });
}

export function normalizeLanguage(lang?: string): string {
  const l = (lang || "").toLowerCase().trim();
  if (l === "python" || l === "py" || l === "python3") return "python";
  if (l === "node" || l === "node-js" || l === "nodejs" || l === "javascript" || l === "js") return "node-js";
  return l || "node-js";
}

export async function checkS3FolderNotEmpty(prefix: string): Promise<boolean> {
  const s3 = getS3Client();
  const bucket = process.env.S3_BUCKET ?? "";
  try {
    const list = await s3.listObjectsV2({ Bucket: bucket, Prefix: prefix, MaxKeys: 1 }).promise();
    return Boolean(list.Contents && list.Contents.length > 0);
  } catch (err) {
    console.warn(`checkS3FolderNotEmpty error for prefix ${prefix}:`, err);
    return false;
  }
}

export async function copyS3Folder(sourcePrefix: string, destinationPrefix: string, continuationToken?: string): Promise<void> {
  const s3 = getS3Client();
  const bucket = process.env.S3_BUCKET ?? "";
  const cleanSource = sourcePrefix.replace(/\/+$/, "");
  const cleanDest = destinationPrefix.replace(/\/+$/, "");

  try {
    const listParams: S3.ListObjectsV2Request = {
      Bucket: bucket,
      Prefix: cleanSource,
      ContinuationToken: continuationToken,
    };

    const listedObjects = await s3.listObjectsV2(listParams).promise();

    if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
      console.warn(`No objects found in S3 with prefix: ${cleanSource}`);
      return;
    }

    await Promise.all(
      listedObjects.Contents.map(async (object) => {
        if (!object.Key) return;
        const relPath = object.Key.slice(cleanSource.length).replace(/^\/+/, "");
        if (!relPath) return; // Directory marker
        const destinationKey = `${cleanDest}/${relPath}`;
        const copyParams = {
          Bucket: bucket,
          CopySource: `${bucket}/${object.Key}`,
          Key: destinationKey,
        };

        await s3.copyObject(copyParams).promise();
        console.log(`Copied ${object.Key} -> ${destinationKey}`);
      })
    );

    if (listedObjects.IsTruncated) {
      await copyS3Folder(sourcePrefix, destinationPrefix, listedObjects.NextContinuationToken);
    }
  } catch (error) {
    console.error("Error copying S3 folder:", error);
    throw error;
  }
}

export async function saveToS3(key: string, filePath: string, content: string): Promise<void> {
  const s3 = getS3Client();
  const cleanKey = key.replace(/\/+$/, "");
  const cleanPath = filePath.replace(/^\/+/, "");
  const params = {
    Bucket: process.env.S3_BUCKET ?? "",
    Key: `${cleanKey}/${cleanPath}`,
    Body: content,
  };

  await s3.putObject(params).promise();
}

