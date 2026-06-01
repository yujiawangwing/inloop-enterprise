import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/compressImage";

interface Props {
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  size?: "sm" | "md";
}

/**
 * 统一的图片上传组件：本地零延迟缩略图 + Canvas 压缩 + Lovable Cloud Storage 上传。
 * - value: 当前已上传图片的远程 URL（受控）
 * - onChange: 新 URL 或 null（已删除）
 */
export function ImageUploader({ value, onChange, label = "上传行程截图 / 邀请函图片", size = "md" }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // value 由父组件控制；本地 previewUrl 仅在用户重新选择时短暂存在
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const displayUrl = previewUrl ?? value ?? null;
  const dim = size === "sm" ? "h-14 w-14" : "h-16 w-16";

  function clear() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    onChange(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("请选择图片文件");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      alert("图片不能超过 20MB");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setUploading(true);

    try {
      let compressed: File;
      try {
        compressed = await compressImage(file, { maxDim: 1200, quality: 0.78 });
      } catch (err) {
        console.warn("compressImage failed, falling back:", err);
        compressed = file;
      }

      const path = `agenda/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error } = await supabase.storage
        .from("agenda-attachments")
        .upload(path, compressed, {
          cacheControl: "3600",
          upsert: false,
          contentType: "image/jpeg",
        });
      if (error) {
        alert(`上传失败：${error.message}`);
        clear();
        return;
      }
      const { data } = supabase.storage.from("agenda-attachments").getPublicUrl(path);
      onChange(data.publicUrl);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />

      {displayUrl ? (
        <div className="relative shrink-0">
          <img
            src={displayUrl}
            alt="行程截图预览"
            className={`${dim} rounded-lg border border-foreground/12 object-cover shadow-sm`}
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/35 backdrop-blur-[1px]">
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            </div>
          )}
          <button
            type="button"
            onClick={clear}
            aria-label="移除图片"
            className="absolute -right-1.5 -top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background shadow ring-2 ring-background transition-all hover:scale-105 active:scale-95"
          >
            <X className="h-2.5 w-2.5 stroke-[2.5]" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-foreground/20 bg-neutral-50/60 px-2.5 py-1.5 text-[10.5px] font-medium text-foreground/55 transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:opacity-60"
        >
          <ImagePlus className="h-3 w-3" />
          {label}
        </button>
      )}

      {displayUrl && (
        <span className="min-w-0 flex-1 text-[10.5px] leading-snug text-foreground/55">
          {uploading ? "正在压缩并上传截图..." : previewUrl && !uploading ? "上传中..." : "截图已就绪"}
        </span>
      )}
    </div>
  );
}
