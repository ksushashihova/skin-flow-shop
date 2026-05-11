// Server functions для загрузки файлов в S3 (Timeweb Cloud Storage).
// Только админ может получить presigned URL.
import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "./auth-middleware.server";
import { presignUploadUrl, deleteObject, publicUrlFor } from "./s3.server";

const SAFE = /[^a-zA-Z0-9._-]+/g;

export const adminPresignUploadFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { folder: string; filename: string; contentType: string }) => d)
  .handler(async ({ data }) => {
    const folder = (data.folder || "uploads").replace(SAFE, "-").replace(/^-+|-+$/g, "") || "uploads";
    const safeName = data.filename.replace(SAFE, "-").slice(-80);
    const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
    return presignUploadUrl(key, data.contentType);
  });

export const adminDeleteObjectFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { key: string }) => d)
  .handler(async ({ data }) => {
    await deleteObject(data.key);
    return { ok: true as const };
  });

export const publicUrlForFn = createServerFn({ method: "GET" })
  .inputValidator((d: { key: string }) => d)
  .handler(async ({ data }) => publicUrlFor(data.key));
