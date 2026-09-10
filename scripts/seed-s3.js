const fs = require("fs");
const path = require("path");
const possibleModuleDirs = [
  path.resolve(__dirname, "../init-service/node_modules"),
  path.resolve(__dirname, "../frontend/node_modules"),
  path.resolve(__dirname, "../runner/node_modules"),
];

for (const modDir of possibleModuleDirs) {
  if (fs.existsSync(modDir)) {
    module.paths.unshift(modDir);
  }
}

const AWS = require("aws-sdk");


// Load .env from frontend/.env or .env
const envPaths = [
  path.resolve(__dirname, "../frontend/.env"),
  path.resolve(__dirname, "../.env")
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require("dotenv").config({ path: envPath });
    break;
  }
}

const s3Bucket = process.env.S3_BUCKET || "s3-podforge";
const s3Endpoint = process.env.S3_ENDPOINT || "https://s3.us-east-1.amazonaws.com";

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  endpoint: s3Endpoint,
  s3ForcePathStyle: true,
});

async function uploadFile(s3Key, localFilePath) {
  const content = fs.readFileSync(localFilePath);
  const ext = path.extname(localFilePath);
  let contentType = "text/plain";
  if (ext === ".html") contentType = "text/html";
  else if (ext === ".js") contentType = "application/javascript";
  else if (ext === ".json") contentType = "application/json";
  else if (ext === ".py") contentType = "text/x-python";
  else if (ext === ".md") contentType = "text/markdown";

  const params = {
    Bucket: s3Bucket,
    Key: s3Key,
    Body: content,
    ContentType: contentType,
  };

  await s3.putObject(params).promise();
  console.log(`✅ Uploaded [${contentType}] s3://${s3Bucket}/${s3Key} (${content.length} bytes)`);
}

async function uploadDirectory(dirPath, s3Prefixes) {
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isFile()) {
      for (const prefix of s3Prefixes) {
        const s3Key = `${prefix}/${file}`;
        await uploadFile(s3Key, filePath);
      }
    }
  }
}

async function seed() {
  console.log("==========================================");
  console.log(`Seeding S3 Base Templates into Bucket: ${s3Bucket}`);
  console.log(`Endpoint: ${s3Endpoint}`);
  console.log("==========================================");

  const templatesDir = path.resolve(__dirname, "../templates");

  // 1. Upload Node.js template to base/node-js/ and base/node/
  const nodeDir = path.join(templatesDir, "node-js");
  if (fs.existsSync(nodeDir)) {
    console.log("\n📦 Uploading Node.js template...");
    await uploadDirectory(nodeDir, ["base/node-js", "base/node"]);
  }

  // 2. Upload Python template to base/python/
  const pythonDir = path.join(templatesDir, "python");
  if (fs.existsSync(pythonDir)) {
    console.log("\n📦 Uploading Python template...");
    await uploadDirectory(pythonDir, ["base/python"]);
  }

  // 3. Verify files in S3
  console.log("\n🔍 Verifying base files in S3 bucket...");
  const listed = await s3.listObjectsV2({ Bucket: s3Bucket, Prefix: "base/" }).promise();
  console.log("\nCurrent base/ files in S3:");
  if (listed.Contents && listed.Contents.length > 0) {
    listed.Contents.forEach((obj) => {
      console.log(` - ${obj.Key} (${obj.Size} bytes, modified: ${obj.LastModified})`);
    });
  } else {
    console.log("No objects found in base/!");
  }

  console.log("\n🎉 S3 base templates seeding completed successfully!");
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
