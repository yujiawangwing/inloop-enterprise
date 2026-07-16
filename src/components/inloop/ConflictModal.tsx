import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlarmClockOff, X } from "lucide-react";

interface Props {
  open: boolean;
  taskTitle: string;
  taskTime: string;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void> | void;
}

export function ConflictModal({ open, taskTitle, taskTime, onClose, onSubmit }: Props) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setBusy(false);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await onSubmit(reason.trim());
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 px-6 backdrop-blur-sm"
      onClick={(e) => {
        e.stopPropagation();
        if (!busy) onClose();
      }}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-foreground/10 bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-foreground/5 bg-gradient-to-br from-amber-50 to-orange-50/60 px-5 py-4">
          <div className="flex items-start gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/15 text-amber-700">
              <AlarmClockOff className="h-4 w-4" />
            </span>
            <div className="leading-tight">
              <p className="text-[13.5px] font-semibold text-amber-900">标记时间冲突</p>
              <p className="mt-0.5 text-[10.5px] text-amber-800/70">
                将向发起人推送反馈通知
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            disabled={busy}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-foreground/50 hover:bg-foreground/5 hover:text-foreground/80 disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4">
          <div className="mb-3 rounded-lg bg-foreground/[0.03] px-3 py-2">
            <p className="text-[10.5px] uppercase tracking-[0.14em] text-foreground/45">
              待处理日程
            </p>
            <p className="mt-1 text-[13px] font-medium text-foreground">
              <span className="mr-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-bold tracking-wide text-amber-800">
                {taskTime}
              </span>
              {taskTitle}
            </p>
          </div>

          <label className="block text-[11px] font-medium text-foreground/70">
            请简要说明冲突原因（选填）
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="例如：同一时段已有其他会议 / 出差在外"
            rows={3}
            maxLength={200}
            className="mt-1.5 w-full resize-none rounded-lg border border-foreground/10 bg-background px-3 py-2 text-[12.5px] leading-relaxed text-foreground outline-none transition-colors placeholder:text-foreground/35 focus:border-primary/50"
          />
          <p className="mt-1 text-right text-[9.5px] text-foreground/40">{reason.length}/200</p>

          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-full border border-foreground/10 px-3.5 py-1.5 text-[11.5px] font-medium text-foreground/65 transition-colors hover:border-foreground/25 hover:text-foreground/85 disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-amber-600 px-4 py-1.5 text-[11.5px] font-semibold text-white shadow-sm transition-all hover:bg-amber-700 active:scale-95 disabled:opacity-50"
            >
              {busy ? "提交中…" : "提交反馈"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
