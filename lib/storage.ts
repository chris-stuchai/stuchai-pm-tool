import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

if (!process.env.S3_BUCKET_NAME) {
  console.warn(
    "S3_BUCKET_NAME is not set. File uploads will fail until the S3 credentials are configured."
  )
}

const s3Client =
  process.env.S3_BUCKET_NAME && process.env.S3_REGION
    ? new S3Client({
        region: process.env.S3_REGION,
        credentials:
          process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
            ? {
                accessKeyId: process.env.S3_ACCESS_KEY_ID,
                secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
              }
            : undefined,
      })
    : null

export async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType?: string
): Promise<string> {
  if (!s3Client || !process.env.S3_BUCKET_NAME) {
    throw new Error("S3 is not configured.")
  }

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: "private",
  })

  await s3Client.send(command)

  if (process.env.S3_PUBLIC_URL) {
    return `${process.env.S3_PUBLIC_URL.replace(/\/$/, "")}/${key}`
  }

  const region = process.env.S3_REGION
  return `https://${process.env.S3_BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`
}

