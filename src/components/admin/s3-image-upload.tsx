// Виджет: загрузка картинки в S3 через presigned URL.
// Используется в админке для смены изображений товаров/баннеров/постов.
import { useState, useRef } from "react";
import { adminPresignUploadFn } from "@/lib/s3.functions";

export function S3ImageUpload({
  folder = "uploads",
  value,
  onChange,
  label = "Загрузить изображение",
}: {
  folder?: string;
  value?: string;
  onChange: (publicUrl: string) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handle(file: File) {
    setErr(null);
    setBusy(true);
    try {
      const presigned = await adminPresignUploadFn({
        data: { folder, filename: file.name, contentType: file.type || "application/octet-stream" },
      });
      const put = await fetch(presigned.url, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!put.ok) throw new Error(`S3 загрузка не удалась: ${put.status}`);
      onChange(presigned.publicUrl);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      {value && (
        // eslint-disable-next-line jsx-a11y/img-redundant-alt
        <img src={value} alt="превью" className="h-24 w-24 object-cover border border-border" />
      )}
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="text-xs"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handle(f);
          }}
        />
        <span className="text-xs text-muted-foreground">{busy ? "Загружаем…" : label}</span>
      </div>
      {err && <div className="text-xs text-destructive">{err}</div>}
    </div>
  );
}
