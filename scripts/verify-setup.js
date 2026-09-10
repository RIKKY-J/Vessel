const fs = require("fs");
const path = require("path");

const possibleModuleDirs = [
  path.resolve(__dirname, "../init-service/node_modules"),
  path.resolve(__dirname, "../frontend/node_modules"),
];

for (const modDir of possibleModuleDirs) {
  if (fs.existsSync(modDir)) {
    module.paths.unshift(modDir);
  }
}

const AWS = require("aws-sdk");
require("dotenv").config({ path: path.resolve(__dirname, "../frontend/.env") });

const s3Bucket = process.env.S3_BUCKET || "s3-podforge";
const s3Endpoint = process.env.S3_ENDPOINT || "https://s3.us-east-1.amazonaws.com";

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  endpoint: s3Endpoint,
  s3ForcePathStyle: true,
});

async function run() {
  console.log("==========================================");
  console.log("Verifying S3 Base Templates & Pod Config");
  console.log("==========================================");

  // 1. Check all base/ templates in S3
  const list = await s3.listObjectsV2({ Bucket: s3Bucket, Prefix: "base/" }).promise();
  const keys = (list.Contents || []).map((c) => c.Key);
  console.log(`\nFound ${keys.length} base objects in S3:`);
  keys.forEach((k) => console.log(`  - ${k}`));

  const requiredNode = [
    "base/node-js/index.js",
    "base/node-js/package.json",
    "base/node-js/README.md",
    "base/node-js/.gitignore",
  ];
  const requiredPy = [
    "base/python/main.py",
    "base/python/index.html",
    "base/python/requirements.txt",
    "base/python/README.md",
    "base/python/.gitignore",
  ];

  for (const r of requiredNode) {
    if (!keys.includes(r)) throw new Error(`Missing required S3 key: ${r}`);
  }
  console.log("\n✅ All Node.js base files present in S3");

  for (const r of requiredPy) {
    if (!keys.includes(r)) throw new Error(`Missing required S3 key: ${r}`);
  }
  console.log("✅ All Python base files present in S3");

  // 2. Test copy operation to simulate project start
  const testReplId = `verify-run-${Date.now()}`;
  console.log(`\nTesting project start copy simulation for replId: ${testReplId} (Python)...`);

  const pyObjects = list.Contents.filter((c) => c.Key.startsWith("base/python/"));
  for (const item of pyObjects) {
    const destKey = item.Key.replace("base/python", `code/${testReplId}`);
    await s3.copyObject({
      Bucket: s3Bucket,
      CopySource: `${s3Bucket}/${item.Key}`,
      Key: destKey,
    }).promise();
    console.log(`Copied ${item.Key} -> ${destKey}`);
  }

  const projectObjects = await s3.listObjectsV2({ Bucket: s3Bucket, Prefix: `code/${testReplId}/` }).promise();
  console.log(`Verified ${projectObjects.Contents.length} project files copied to code/${testReplId}/`);

  // Clean up
  for (const item of projectObjects.Contents) {
    await s3.deleteObject({ Bucket: s3Bucket, Key: item.Key }).promise();
  }
  console.log(`✅ Cleaned up temporary test project files from S3`);

  // 3. Validate k8s manifest parsing
  console.log("\nValidating Kubernetes manifest generation for Node and Python pods...");
  const k8sCode = fs.readFileSync(path.resolve(__dirname, "../frontend/src/lib/k8s.ts"), "utf-8");
  if (!k8sCode.includes("s3://{{S3_BUCKET}}/base/{{LANGUAGE}}/")) {
    throw new Error("k8s.ts is missing base language fallback in copy-s3-resources initContainer");
  }
  if (!k8sCode.includes("AWS_DEFAULT_REGION")) {
    throw new Error("k8s.ts is missing AWS_DEFAULT_REGION environment variable");
  }
  if (!k8sCode.includes("S3_ENDPOINT")) {
    throw new Error("k8s.ts is missing S3_ENDPOINT in runner container");
  }
  console.log("✅ k8s.ts manifest includes S3 base fallback, region, and runner S3 env vars");

  console.log("\n🎉 ALL VERIFICATIONS PASSED!");
}

run().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
