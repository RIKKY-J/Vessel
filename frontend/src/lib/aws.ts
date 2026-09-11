import { S3 } from "aws-sdk";
import crypto from "crypto";

function getS3Client(): S3 {
  return new S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.AWS_REGION || "us-east-1",
    s3ForcePathStyle: true,
  });
}

export function normalizeLanguage(lang?: string): string {
  const l = (lang || "").toLowerCase().trim();
  if (l === "python" || l === "py" || l === "python3") return "python";
  if (l === "node" || l === "node-js" || l === "nodejs" || l === "javascript" || l === "js") return "node-js";
  return l || "node-js";
}

export function sanitizeEmail(email: string): string {
  return (email || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "_");
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

export interface S3ProjectInfo {
  id: string;
  name: string;
  language: string;
  createdAt?: string;
}

export type UserProjectItem = S3ProjectInfo;

export interface UserProfile {
  email: string;
  name: string;
  avatar?: string;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface UserAuthData {
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  lastLoginAt: string;
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
}

export async function registerUserInS3(
  email: string,
  password: string,
  name?: string
): Promise<UserProfile> {
  const s3 = getS3Client();
  const bucket = process.env.S3_BUCKET ?? "";
  const sanitized = sanitizeEmail(email);
  const key = `users/${sanitized}/auth.json`;

  // 1. Check if user already exists
  try {
    const check = await s3.headObject({ Bucket: bucket, Key: key }).promise();
    if (check) {
      throw new Error("An account with this email address already exists. Please sign in.");
    }
  } catch (err: any) {
    if (err.statusCode !== 404 && err.code !== "NotFound") {
      if (err.message && err.message.includes("already exists")) throw err;
    }
  }

  // 2. Hash password with salt
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);
  const now = new Date().toISOString();
  const displayName = name?.trim() || email.split("@")[0];

  const authData: UserAuthData = {
    email: email.toLowerCase().trim(),
    name: displayName,
    passwordHash,
    salt,
    createdAt: now,
    lastLoginAt: now,
  };

  await s3
    .putObject({
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify(authData, null, 2),
      ContentType: "application/json",
    })
    .promise();

  // Also sync profile and empty projects
  const profileKey = `users/${sanitized}/profile.json`;
  await s3
    .putObject({
      Bucket: bucket,
      Key: profileKey,
      Body: JSON.stringify(
        {
          email: email.toLowerCase().trim(),
          name: displayName,
          createdAt: now,
          lastLoginAt: now,
        },
        null,
        2
      ),
      ContentType: "application/json",
    })
    .promise();

  const projectsKey = `users/${sanitized}/projects.json`;
  try {
    await s3.headObject({ Bucket: bucket, Key: projectsKey }).promise();
  } catch {
    await s3
      .putObject({
        Bucket: bucket,
        Key: projectsKey,
        Body: JSON.stringify([], null, 2),
        ContentType: "application/json",
      })
      .promise();
  }

  return {
    email: email.toLowerCase().trim(),
    name: displayName,
    createdAt: now,
    lastLoginAt: now,
  };
}

export async function authenticateUserInS3(
  email: string,
  password: string
): Promise<UserProfile> {
  const s3 = getS3Client();
  const bucket = process.env.S3_BUCKET ?? "";
  const sanitized = sanitizeEmail(email);
  const key = `users/${sanitized}/auth.json`;

  let authData: UserAuthData | null = null;
  try {
    const res = await s3.getObject({ Bucket: bucket, Key: key }).promise();
    if (res.Body) {
      authData = JSON.parse(res.Body.toString("utf-8"));
    }
  } catch (err: any) {
    throw new Error("No account found with this email. Please check your email or sign up.");
  }

  if (!authData || !authData.passwordHash || !authData.salt) {
    throw new Error("Invalid account data. Please reset or recreate your account.");
  }

  const computedHash = hashPassword(password, authData.salt);
  if (computedHash !== authData.passwordHash) {
    throw new Error("Incorrect password. Please try again.");
  }

  // Update last login
  authData.lastLoginAt = new Date().toISOString();
  await s3
    .putObject({
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify(authData, null, 2),
      ContentType: "application/json",
    })
    .promise();

  return {
    email: authData.email,
    name: authData.name,
    createdAt: authData.createdAt,
    lastLoginAt: authData.lastLoginAt,
  };
}

export async function syncUserInS3(user: UserProfile): Promise<UserProfile> {
  const s3 = getS3Client();
  const bucket = process.env.S3_BUCKET ?? "";
  const sanitized = sanitizeEmail(user.email);
  const key = `users/${sanitized}/profile.json`;

  let existing: UserProfile | null = null;
  try {
    const res = await s3.getObject({ Bucket: bucket, Key: key }).promise();
    if (res.Body) {
      existing = JSON.parse(res.Body.toString("utf-8"));
    }
  } catch {}

  const now = new Date().toISOString();
  const updatedUser: UserProfile = {
    email: user.email,
    name: user.name || existing?.name || "Developer",
    avatar: user.avatar || existing?.avatar,
    createdAt: existing?.createdAt || now,
    lastLoginAt: now,
  };

  await s3
    .putObject({
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify(updatedUser, null, 2),
      ContentType: "application/json",
    })
    .promise();

  return updatedUser;
}

export async function getUserProjects(email: string): Promise<UserProjectItem[]> {
  const s3 = getS3Client();
  const bucket = process.env.S3_BUCKET ?? "";
  const sanitized = sanitizeEmail(email);
  const key = `users/${sanitized}/projects.json`;

  try {
    const res = await s3.getObject({ Bucket: bucket, Key: key }).promise();
    if (res.Body) {
      const list = JSON.parse(res.Body.toString("utf-8"));
      if (Array.isArray(list)) return list;
    }
  } catch {}

  return [];
}

export async function addProjectToUser(email: string, project: UserProjectItem): Promise<void> {
  const s3 = getS3Client();
  const bucket = process.env.S3_BUCKET ?? "";
  const sanitized = sanitizeEmail(email);
  const key = `users/${sanitized}/projects.json`;

  const existing = await getUserProjects(email);
  const updated = [
    project,
    ...existing.filter((p) => p.id !== project.id),
  ];

  await s3
    .putObject({
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify(updated, null, 2),
      ContentType: "application/json",
    })
    .promise();
}

export async function deleteProjectFromUser(email: string, replId: string): Promise<void> {
  const s3 = getS3Client();
  const bucket = process.env.S3_BUCKET ?? "";
  const sanitized = sanitizeEmail(email);
  const key = `users/${sanitized}/projects.json`;

  // 1. Update user projects list in S3
  const existing = await getUserProjects(email);
  const updated = existing.filter((p) => p.id !== replId);

  await s3
    .putObject({
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify(updated, null, 2),
      ContentType: "application/json",
    })
    .promise();

  // 2. Delete all files in S3 under code/${replId}/
  try {
    const list = await s3
      .listObjectsV2({
        Bucket: bucket,
        Prefix: `code/${replId}/`,
      })
      .promise();

    if (list.Contents && list.Contents.length > 0) {
      await s3
        .deleteObjects({
          Bucket: bucket,
          Delete: {
            Objects: list.Contents.map((obj) => ({ Key: obj.Key! })),
          },
        })
        .promise();
    }
  } catch (err) {
    console.warn(`Error deleting S3 folder code/${replId}/:`, err);
  }
}

export async function listS3Projects(email?: string): Promise<S3ProjectInfo[]> {
  if (email) {
    return getUserProjects(email);
  }

  const s3 = getS3Client();
  const bucket = process.env.S3_BUCKET ?? "";

  try {
    const data = await s3
      .listObjectsV2({
        Bucket: bucket,
        Prefix: "code/",
        Delimiter: "/",
      })
      .promise();

    const prefixes = data.CommonPrefixes || [];
    const projects: S3ProjectInfo[] = prefixes
      .map((p) => {
        const id = (p.Prefix || "").replace(/^code\//, "").replace(/\/+$/, "");
        return {
          id,
          name: id,
          language: id.toLowerCase().includes("python") ? "python" : "node-js",
        };
      })
      .filter((p) => Boolean(p.id));

    return projects.reverse();
  } catch (error) {
    console.error("Error listing S3 projects:", error);
    return [];
  }
}



