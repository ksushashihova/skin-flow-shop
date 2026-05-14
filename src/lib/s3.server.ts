import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let _s3: S3Client | undefined;

function getS3() {
  if (_s3) return _s3;
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION || "ru-1";
  const accessKeyId = process.env.S3_ACCESS_KEY;
  const secretAccessKey = process.env.S3_SECRET_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("S3 не сконфигурирован: S3_ENDPOINT/S3_ACCESS_KEY/S3_SECRET_KEY");
  }
  _s3 = new S3Client({
    endpoint, region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
  return _s3;
}

const BUCKET = () => process.env.S3_BUCKET || "ksushashi";
const PUBLIC_URL = () => (process.env.S3_PUBLIC_URL || "").replace(/\/+$/, "");

export function publicUrlFor(key: string) {
  return `${PUBLIC_URL()}/${key.replace(/^\/+/, "")}`;
}

export async function presignUploadUrl(key: string, contentType: string, expiresInSec = 600) {
  const cmd = new PutObjectCommand({ Bucket: BUCKET(), Key: key, ContentType: contentType, ACL: "public-read" });
  const url = await getSignedUrl(getS3(), cmd, { expiresIn: expiresInSec });
  return { url, key, publicUrl: publicUrlFor(key) };
}

export async function presignDownloadUrl(key: string, expiresInSec = 600) {
  const cmd = new GetObjectCommand({ Bucket: BUCKET(), Key: key });
  return getSignedUrl(getS3(), cmd, { expiresIn: expiresInSec });
}

export async function deleteObject(key: string) {
  await getS3().send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: key }));
}
