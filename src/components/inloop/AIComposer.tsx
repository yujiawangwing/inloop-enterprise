import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, ImagePlus, Mic, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/compressImage";
import { OwnerSelector } from "./OwnerSelector";
import { ImageLightbox } from "./ImageLightbox";
import { MOCK_USERS } from "@/lib/mockUsers";


interface Props {
  onSync: (instruction: string, attachmentUrl: string, ownerIds: string[]) => void;
  remaining?: number | null;
  loading?: boolean;
  currentUserId?: string | null;
}

// Minimal typing for the Web Speech API
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
};

export function AIComposer({ onSync, remaining, loading = false, currentUserId }: Props) {
  const [instruction, setInstruction] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [listening, setListening] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (currentUserId) {
      setOwnerIds((prev) => {
        // 将历史的 mock me.id 替换为真实 uid；若已有真实 uid 则不动
        const next = prev.map((id) => (id === MOCK_USERS.me.id ? currentUserId : id));
        return next.length === 0 ? [currentUserId] : next;
      });
    }
  }, [currentUserId]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const baseTextRef = useRef("");
  const canSend = (instruction.trim().length > 0 || attachmentUrl.trim().length > 0) && !uploading;

  useEffect(() => {
    return () => {
      try { recognitionRef.current?.stop(); } catch { /* noop */ }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearAttachment() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setAttachmentUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function submit() {
    if (!canSend || loading) return;
    onSync(instruction.trim(), attachmentUrl.trim(), ownerIds);
    setInstruction("");
    clearAttachment();
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

    // 1) 零延迟本地预览
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setAttachmentUrl("");
    setUploading(true);

    try {
      // 2) Canvas 极限压缩（≤1200px，JPEG q=0.78）
      let compressed: File;
      try {
        compressed = await compressImage(file, { maxDim: 1200, quality: 0.78 });
      } catch (err) {
        console.warn("compressImage failed, falling back to original:", err);
        compressed = file;
      }

      // 3) 上传到 Lovable Cloud Storage
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
        clearAttachment();
        return;
      }
      const { data } = supabase.storage.from("agenda-attachments").getPublicUrl(path);
      setAttachmentUrl(data.publicUrl);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function toggleMic() {
    if (listening) {
      try { recognitionRef.current?.stop(); } catch { /* noop */ }
      return;
    }
    const Ctor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .webkitSpeechRecognition;
    if (!Ctor) {
      alert("当前浏览器不支持语音输入，请使用键盘录入");
      return;
    }
    const rec = new Ctor();
    rec.lang = "zh-CN";
    rec.continuous = true;
    rec.interimResults = true;
    baseTextRef.current = instruction ? instruction.replace(/\s+$/, "") + " " : "";

    rec.onresult = (e) => {
      let finalText = "";
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        const transcript = r[0].transcript;
        if (r.isFinal) finalText += transcript;
        else interim += transcript;
      }
      setInstruction(baseTextRef.current + finalText + interim);
    };
    rec.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    rec.onerror = (ev) => {
      console.warn("SpeechRecognition error:", ev?.error);
      setListening(false);
      if (ev?.error === "not-allowed" || ev?.error === "service-not-allowed") {
        alert("麦克风权限被拒绝，请在浏览器设置中允许后再试");
      }
    };

    try {
      rec.start();
      recognitionRef.current = rec;
      setListening(true);
    } catch (err) {
      console.warn("SpeechRecognition start failed:", err);
      alert("语音识别启动失败，请稍后再试");
    }
  }

  return (
    <div className="rounded-2xl border border-foreground/10 bg-card p-2.5 shadow-[0_1px_2px_rgba(34,34,34,0.04),0_12px_32px_-14px_rgba(34,34,34,0.12)] transition-all focus-within:border-primary/40 focus-within:shadow-[0_1px_2px_rgba(34,34,34,0.04),0_16px_40px_-14px_rgba(107,122,106,0.25)]">
      <div className="flex items-center justify-between gap-2 px-1 pb-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <Sparkles className="h-2.5 w-2.5 shrink-0 text-primary" />
          <span className="truncate text-[9px] font-medium uppercase tracking-[0.2em] text-foreground/55">
            Inloop AI · 助理指令输入
          </span>
        </div>
        <OwnerSelector
          value={ownerIds}
          onChange={setOwnerIds}
          currentUserId={currentUserId}
          size="sm"
          align="end"
        />
      </div>

      {/* 主输入框：自然语言工作指令 + 麦克风 */}
      <div className="relative">
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          rows={2}
          placeholder={
            listening
              ? "正在拾音中，请清晰口述工作要务指令...（再次点击麦克风停止）"
              : "请输入或口述工作要务指令：如\"6月2日下午两点参加半导体行业技术峰会\"..."
          }
          className="block w-full resize-none border-0 bg-transparent px-1 py-1 pr-8 text-[12.5px] leading-relaxed text-foreground placeholder:text-foreground/35 focus:outline-none"
        />
        <button
          type="button"
          onClick={toggleMic}
          aria-label={listening ? "停止语音输入" : "开始语音输入"}
          aria-pressed={listening}
          className={`absolute bottom-1 right-1 inline-flex h-6 w-6 items-center justify-center rounded-full transition-all active:scale-95 ${
            listening
              ? "bg-red-500/10 text-red-500 animate-pulse ring-2 ring-red-500/30"
              : "text-foreground/40 hover:text-foreground/70 hover:bg-foreground/5"
          }`}
        >
          <Mic className="h-3 w-3" />
        </button>
      </div>

      {/* 图片附件上传 */}
      <div className="mt-1.5 flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />

        {previewUrl ? (
          <div className="relative shrink-0">
            <img
              src={previewUrl}
              alt="行程截图本地预览"
              className="h-16 w-16 rounded-lg border border-foreground/12 object-cover shadow-sm"
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/35 backdrop-blur-[1px]">
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              </div>
            )}
            <button
              type="button"
              onClick={clearAttachment}
              aria-label="移除附件"
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
            上传行程截图 / 邀请函图片
          </button>
        )}

        {previewUrl && (
          <span className="min-w-0 flex-1 text-[10.5px] leading-snug text-foreground/55">
            {uploading
              ? "正在压缩并上传截图..."
              : attachmentUrl
                ? "截图已就绪，可一并发送给 AI 解析"
                : "本地预览中"}
          </span>
        )}
      </div>

      <div className="mt-1.5 flex items-center justify-between border-t border-foreground/8 pt-1.5">
        <span className="px-1 text-[9.5px] text-foreground/45">
          {remaining == null
            ? "Pro · 无限智能同步"
            : `本月剩余智能同步额度：${remaining} 次`}
        </span>
        <button
          type="button"
          onClick={submit}
          disabled={!canSend || loading}
          style={{ WebkitAppearance: "none", appearance: "none" }}
          className={`group inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium tracking-wide shadow-[0_8px_22px_-10px_rgba(107,122,106,0.65)] transition-all active:scale-[0.97] appearance-none ${
            !canSend || loading
              ? "bg-neutral-200 text-neutral-500 shadow-none cursor-not-allowed"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          } ${loading ? "animate-pulse" : ""}`}
        >
          <Send className="h-2.5 w-2.5" />
          {loading ? "🤖 智能解析中..." : "智能同步"}
        </button>
      </div>
    </div>
  );
}
