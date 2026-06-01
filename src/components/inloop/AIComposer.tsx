import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Link2, Mic } from "lucide-react";

interface Props {
  onSync: (instruction: string, pastedLink: string) => void;
  remaining?: number | null;
  loading?: boolean;
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

export function AIComposer({ onSync, remaining, loading = false }: Props) {
  const [instruction, setInstruction] = useState("");
  const [linkRaw, setLinkRaw] = useState("");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTextRef = useRef("");
  const canSend = instruction.trim().length > 0 || linkRaw.trim().length > 0;

  useEffect(() => {
    return () => {
      try { recognitionRef.current?.stop(); } catch { /* noop */ }
    };
  }, []);

  function submit() {
    if (!canSend || loading) return;
    onSync(instruction.trim(), linkRaw.trim());
    setInstruction("");
    setLinkRaw("");
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
      alert("当前浏览器不支持语音输入，请使用键盘打字哦");
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
        alert("麦克风权限被拒绝，请在浏览器设置中允许后再试～");
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
      <div className="flex items-center gap-1.5 px-1 pb-1.5">
        <Sparkles className="h-2.5 w-2.5 text-primary" />
        <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-foreground/55">
          Inloop AI · 管理员输入
        </span>
      </div>

      {/* 上层主框：自然语言指令 + 麦克风按钮 */}
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
              ? "正在倾听中，请说话...（完成后再次点击麦克风停止）"
              : '用大白话碎碎念：比如"早上七八点吃药、下午去公园"...'
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

      {/* 下层副框：可选链接 */}
      <div className="mt-1 flex items-center gap-1.5 rounded-lg bg-neutral-100 px-2 py-1.5">
        <Link2 className="h-2.5 w-2.5 shrink-0 text-neutral-500" />
        <input
          type="text"
          value={linkRaw}
          onChange={(e) => setLinkRaw(e.target.value)}
          placeholder="可选：粘贴小红书/公众号/视频原教程链接..."
          style={{ WebkitAppearance: "none", appearance: "none", backgroundColor: "transparent", color: "rgb(64,64,64)" }}
          className="block w-full border-0 bg-transparent text-[11px] text-neutral-700 placeholder:text-neutral-400 focus:outline-none appearance-none"
        />
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
