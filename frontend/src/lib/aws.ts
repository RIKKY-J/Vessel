import { S3 } from "aws-sdk";

function getS3Client(): S3 {
  return new S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    endpoint: process.env.S3_ENDPOINT,
    s3ForcePathStyle: true,
  });
}

export async function copyS3Folder(sourcePrefix: string, destinationPrefix: string, continuationToken?: string): Promise<void> {
  const s3 = getS3Client();
  const bucket = process.env.S3_BUCKET ?? "";

  try {
    const listParams: S3.ListObjectsV2Request = {
      Bucket: bucket,
      Prefix: sourcePrefix,
      ContinuationToken: continuationToken,
    };

    const listedObjects = await s3.listObjectsV2(listParams).promise();

    if (!listedObjects.Contents || listedObjects.Contents.length === 0) return;

    await Promise.all(
      listedObjects.Contents.map(async (object) => {
        if (!object.Key) return;
        const destinationKey = object.Key.replace(sourcePrefix, destinationPrefix);
        const copyParams = {
          Bucket: bucket,
          CopySource: `${bucket}/${object.Key}`,
          Key: destinationKey,
        };

        await s3.copyObject(copyParams).promise();
        console.log(`Copied ${object.Key} to ${destinationKey}`);
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
  const params = {
    Bucket: process.env.S3_BUCKET ?? "",
    Key: `${key}${filePath}`,
    Body: content,
  };

  await s3.putObject(params).promise();
}
