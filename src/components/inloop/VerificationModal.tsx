import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ShieldCheck, Sparkles, Pencil, Repeat, Users } from "lucide-react";
import type { DraftTask } from "@/lib/parseDraft";
import { ImageUploader } from "./ImageUploader";
import { ImageLightbox } from "./ImageLightbox";
import { OwnerSelector } from "./OwnerSelector";
import { MOCK_USERS, getMockUserById } from "@/lib/mockUsers";

interface Props {
  open: boolean;
  drafts: DraftTask[];
  onCancel: () => void;
  onConfirm: (finalDrafts: DraftTask[]) => void;
  currentUserId?: string | null;
}

export function VerificationModal({ open, drafts, onCancel, onConfirm, currentUserId }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editable, setEditable] = useState<DraftTask[]>(drafts);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    setEditable(drafts);
    if (!open) setIsEditing(false);
  }, [drafts, open]);

  function updateField<K extends keyof DraftTask>(idx: number, key: K, value: DraftTask[K]) {
    setEditable((prev) => prev.map((d, i) => (i === idx ? { ...d, [key]: value } : d)));
  }

  function recurrenceLabel(d: DraftTask): string | null {
    if (!d.is_recurring) return null;
    if (d.recurrence_type === "weekly") {
      const days = d.recurrence_days ?? [];
      if (days.length === 0) return "🔁 每周";
      const names = ["一", "二", "三", "四", "五", "六", "日"];
      const tag = days
        .filter((n) => n >= 1 && n <= 7)
        .sort()
        .map((n) => names[n - 1])
        .join("");
      return `🔁 每周${tag}`;
    }
    return "🔁 每天";
  }


  function handleLeft() {
    if (isEditing) {
      // 放弃修改 — 恢复原始 AI 解析结果
      setEditable(drafts);
      setIsEditing(false);
    } else {
      // 取消，重新编辑 — 切换为可编辑表单（不关闭弹窗）
      setIsEditing(true);
    }
  }

  function handleRight() {
    if (isEditing) {
      onConfirm(editable);
    } else {
      onConfirm(drafts);
    }
  }

  const list = isEditing ? editable : drafts;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-h-[88vh] max-w-[420px] overflow-y-auto rounded-2xl border-foreground/10 bg-background p-0 sm:rounded-2xl">
        <DialogHeader className="space-y-2 border-b border-foreground/8 px-6 pb-5 pt-6 text-left">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-primary">
            {isEditing ? <Pencil className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
            {isEditing ? "手动微调" : "安全校验"}
          </div>
          <DialogTitle className="text-[19px] font-semibold tracking-tight text-foreground">
            {isEditing ? "微调日程内容" : "AI 日程安全校验"}
          </DialogTitle>
          <DialogDescription className="text-[12.5px] leading-relaxed text-foreground/55">
            {isEditing
              ? "直接修改时间、任务名或链接，完成后点击保存并发布。"
              : "请管理员核对以下由 AI 自动编排的时间轴，确认无误后发布。"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-6 py-5">
          {list.map((d, i) =>
            isEditing ? (
              <div
                key={i}
                className="rounded-xl border border-foreground/10 bg-card p-3.5"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={d.time}
                    onChange={(e) => updateField(i, "time", e.target.value)}
                    placeholder="HH:MM"
                    className="w-[72px] rounded-md border border-foreground/12 bg-background px-2 py-1.5 text-[12px] font-medium tracking-[0.06em] text-primary placeholder:text-foreground/30 focus:border-primary/50 focus:outline-none"
                  />
                  {recurrenceLabel(d) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#7A9B76]/15 px-2 py-0.5 text-[10px] font-medium tracking-[0.06em] text-[#5d7c5a]">
                      <Repeat className="h-2.5 w-2.5" />
                      {recurrenceLabel(d)}
                    </span>
                  )}
                  <span className="h-px flex-1 bg-foreground/8" />
                </div>

                <input
                  type="text"
                  value={d.title}
                  onChange={(e) => updateField(i, "title", e.target.value)}
                  placeholder="任务名"
                  className="mt-2 block w-full rounded-md border border-foreground/12 bg-background px-2.5 py-1.5 text-[14px] font-medium leading-snug text-foreground placeholder:text-foreground/30 focus:border-primary/50 focus:outline-none"
                />
                <div className="mt-1.5">
                  <OwnerSelector
                    value={d.owner_ids && d.owner_ids.length > 0 ? d.owner_ids : [MOCK_USERS.me.id]}
                    onChange={(ids) => updateField(i, "owner_ids", ids)}
                    currentUserId={currentUserId}
                    size="sm"
                  />
                </div>
                <div className="mt-1.5">
                  <ImageUploader
                    value={d.image_url ?? null}
                    onChange={(url) => updateField(i, "image_url", url ?? undefined)}
                    size="sm"
                    label="上传行程截图"
                  />
                </div>
                <textarea
                  value={d.note ?? ""}
                  onChange={(e) => updateField(i, "note", e.target.value || undefined)}
                  placeholder="AI 一句话重点（可选）"
                  rows={2}
                  className="mt-1.5 block w-full resize-none rounded-md border border-foreground/10 bg-background px-2.5 py-1.5 text-[11.5px] leading-relaxed text-foreground/70 placeholder:text-foreground/30 focus:border-primary/40 focus:outline-none"
                />
              </div>
            ) : (
              <div
                key={i}
                className="rounded-xl border border-foreground/8 bg-card p-4 shadow-[0_1px_2px_rgba(34,34,34,0.03)]"
              >
                <div className="flex items-baseline gap-3">
                  <span className="text-[11px] font-semibold tracking-[0.14em] text-primary">
                    🌟 {d.time}
                  </span>
                  {recurrenceLabel(d) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#7A9B76]/15 px-2 py-0.5 text-[10px] font-medium tracking-[0.06em] text-[#5d7c5a]">
                      <Repeat className="h-2.5 w-2.5" />
                      {recurrenceLabel(d)}
                    </span>
                  )}
                  {d.type === "milestone" && d.execution_date && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium tracking-[0.08em] text-primary">
                      未来日程 · {d.execution_date}
                    </span>
                  )}
                  <span className="h-px flex-1 bg-foreground/8" />
                </div>

                <p className="mt-2 break-words text-[15px] font-medium leading-snug text-foreground">
                  {d.title}
                </p>

                {/* 协同目标药丸 */}
                {d.owner_ids && d.owner_ids.length > 0 && (
                  <div className="mt-2 inline-flex flex-wrap items-center gap-1.5">
                    <Users className="h-3 w-3 text-foreground/40" />
                    <span className="text-[9.5px] font-medium uppercase tracking-[0.16em] text-foreground/45">
                      指派
                    </span>
                    {d.owner_ids.map((oid) => {
                      const u = getMockUserById(oid);
                      if (!u) return null;
                      const isMe = oid === currentUserId;
                      return (
                        <span
                          key={oid}
                          className={`inline-flex items-center rounded-full px-1.5 py-[1px] text-[10px] font-medium leading-none ${u.avatarColor} ${isMe ? "ring-1 ring-primary/30" : ""}`}
                        >
                          {isMe ? "我本人" : u.label}
                          {!isMe && (
                            <span className="ml-1 text-[8.5px] font-semibold tracking-wider opacity-70">
                              · 待确认
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                )}

                {d.image_url && (
                  <button
                    type="button"
                    onClick={() => setLightboxSrc(d.image_url ?? null)}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-foreground/10 bg-background p-1.5 transition-all hover:border-primary/40 hover:bg-primary/5"
                    aria-label="查看大图"
                  >
                    <img
                      src={d.image_url}
                      alt="行程截图"
                      className="h-12 w-12 rounded-md object-cover"
                    />
                    <span className="pr-2 text-[10.5px] font-medium text-foreground/60">
                      📸 行程截图（点击查看大图）
                    </span>
                  </button>
                )}

                {d.note && (
                  <div className="mt-3 rounded-lg border border-primary/15 bg-primary/[0.04] px-3 py-2.5">
                    <div className="mb-1 inline-flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-primary">
                      <Sparkles className="h-2.5 w-2.5" />
                      AI 提炼要领
                    </div>
                    <p className="break-words text-[12.5px] leading-relaxed text-foreground/75">
                      💡 {d.note}
                    </p>
                  </div>
                )}
              </div>
            )
          )}

          {list.length === 0 && (
            <p className="py-8 text-center text-[13px] text-foreground/50">
              没有解析出任何日程，请返回编辑。
            </p>
          )}
        </div>

        <div className="sticky bottom-0 flex gap-2 border-t border-foreground/8 bg-background/95 px-6 py-4 backdrop-blur">
          <button
            type="button"
            onClick={handleLeft}
            className="flex-1 rounded-full border border-foreground/15 bg-background px-4 py-2.5 text-[12.5px] font-medium text-foreground/75 transition-all hover:bg-foreground/5 active:scale-[0.98]"
          >
            {isEditing ? "放弃修改" : "取消，重新编辑"}
          </button>
          <button
            type="button"
            onClick={handleRight}
            disabled={list.length === 0}
            className="flex-[1.4] rounded-full bg-primary px-4 py-2.5 text-[12.5px] font-semibold tracking-wide text-primary-foreground shadow-[0_8px_22px_-10px_rgba(107,122,106,0.65)] transition-all hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-foreground/15"
          >
            {isEditing ? "保存并发布" : "确认发布"}
          </button>
        </div>
      </DialogContent>
      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </Dialog>
  );
}
