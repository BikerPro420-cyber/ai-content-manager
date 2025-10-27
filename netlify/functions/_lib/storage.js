// Optional S3 upload support; returns https URL or throws if not configured
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

async function maybeUploadS3(filePath, contentType="video/mp4") {
  const bucket = process.env.S3_BUCKET;
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    return null; // not configured
  }
  const key = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${path.basename(filePath)}`;
  const s3 = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
  const Body = fs.readFileSync(filePath);
  await s3.send(new PutObjectCommand({
    Bucket: bucket, Key: key, Body, ContentType: contentType, ACL: "public-read"
  }));
  return `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key)}`;
}

module.exports = { maybeUploadS3 };
