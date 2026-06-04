import { cn } from "@/lib/utils";
import { Check, Trash2, MessageSquarePlus } from "lucide-react";
import type { Mode } from "./ModeSwitch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEffect, useState } from "react";
import { ImageLightbox } from "./ImageLightbox";
import { supabase } from "@/integrations/supabase/client";
import { getMockUserById } from "@/lib/mockUsers";

export type TaskType = "temporary" | "routine" | "milestone";

export interface Task {
  id: string;
  time: string;
  title: string;
  note?: string;
  link?: string;
  image_url?: string;
  done: boolean;
  type: TaskType;
  execution_date?: string;
  feedback_tag?: string | null;
  comment?: string | null;
  creator_id?: string | null;
  owner_id?: string | null;
  flow_status?: string | null;
}

interface Props {
  task: Task;
  onToggle: (id: string) => void;
  mode: Mode;
  onDelete?: (id: string) => void;
}

const FEEDBACK_TAGS: { key: string; label: string }[] = [
  { key: "received", label: "👍 收到" },
  { key: "conflict", label: "⏰ 时间冲突" },
  { key: "later", label: "📍 稍后处理" },
];

export function TaskItem({ task, onToggle, mode, onDelete }: Props) {
  const isFamily = mode === "family"; // 看板模式 (Glanceable)
  const isPlanner = mode === "planner"; // 控制台模式 (Console)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [feedbackTag, setFeedbackTag] = useState<string | null>(task.feedback_tag ?? null);
  const [comment, setComment] = useState<string>(task.comment ?? "");
  const [commentDraft, setCommentDraft] = useState<string>(task.comment ?? "");
  const [commentOpen, setCommentOpen] = useState(false);
  const isVirtual = task.id.startsWith("vr-");

  useEffect(() => {
    setFeedbackTag(task.feedback_tag ?? null);
    setComment(task.comment ?? "");
    setCommentDraft(task.comment ?? "");
  }, [task.feedback_tag, task.comment]);

  async function pickTag(key: string) {
    const next = feedbackTag === key ? null : key;
    setFeedbackTag(next);
    if (isVirtual) return;
    await supabase.from("tasks").update({ feedback_tag: next }).eq("id", task.id);
  }

  async function saveComment() {
    const value = commentDraft.trim();
    setComment(value);
    setCommentOpen(false);
    if (isVirtual) return;
    await supabase.from("tasks").update({ comment: value || null }).eq("id", task.id);
  }

  const activeTagLabel =
    FEEDBACK_TAGS.find((t) => t.key === feedbackTag)?.label ?? null;

  return (
    <div className="relative flex items-stretch gap-4">
      <ImageLightbox
        src={lightboxOpen ? task.image_url ?? null : null}
        onClose={() => setLightboxOpen(false)}
      />
      {/* timeline rail */}
      <div
        className={cn(
          "flex shrink-0 flex-col items-end pt-5",
          isFamily ? "w-20" : "w-14",
        )}
      >
        <div className="flex flex-col items-end gap-0.5">
          {(() => {
            if (!task.execution_date || !/^\d{4}-\d{2}-\d{2}$/.test(task.execution_date)) return null;
            const today = new Date();
            const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
            const [y, m, d] = task.execution_date.split("-").map(Number);
            const t1 = new Date(y, m - 1, d).getTime();
            const diff = Math.round((t1 - t0) / 86400000);
            if (diff === 0) return null; // 今天不展示日期，保持简洁
            const mm = String(m).padStart(2, "0");
            const dd = String(d).padStart(2, "0");
            const label = diff === 1 ? `明天 ${mm}/${dd}` : `${mm}/${dd}`;
            return (
              <span
                className={cn(
                  "rounded-sm px-1 font-medium leading-tight tracking-tight",
                  isFamily ? "text-[12px]" : "text-[9.5px]",
                  diff === 1
                    ? "bg-orange-500/15 text-orange-700"
                    : diff > 1
                      ? "bg-primary/10 text-primary"
                      : "bg-foreground/5 text-foreground/45",
                  task.done && "opacity-50",
                )}
              >
                {label}
              </span>
            );
          })()}
          <span
            className={cn(
              "inline-flex items-center gap-1 font-medium tracking-[0.14em] text-foreground/70 transition-opacity",
              isFamily ? "text-[17px]" : "text-[11px]",
              task.done && "opacity-40",
            )}
          >
            {task.type === "routine" && (
              <span
                aria-hidden
                title="常规循环任务"
                className={cn(
                  "inline-block rounded-full bg-[#7A9B76]",
                  isFamily ? "h-[7px] w-[7px]" : "h-[5px] w-[5px]",
                )}
              />
            )}
            {task.time}
          </span>
        </div>
      </div>

      <div
        className={cn(
          "relative min-w-0 flex-1 overflow-hidden",
          isFamily ? "pb-8" : "pb-3",
        )}
      >
        {/* vertical line */}
        <span
          aria-hidden
          className="absolute -left-[1.125rem] top-6 bottom-0 w-px bg-foreground/15"
        />
        {/* dot */}
        <span
          aria-hidden
          className={cn(
            "absolute -left-[1.3125rem] top-[1.4rem] h-1.5 w-1.5 rounded-full border border-foreground/60 bg-background",
            task.done && "bg-primary border-primary",
          )}
        />

        <div
          className={cn(
            "group flex w-full min-w-0 max-w-full items-start justify-between gap-4 overflow-hidden rounded-xl border border-foreground/[0.06] bg-card shadow-[0_1px_2px_rgba(34,34,34,0.04),0_8px_24px_-12px_rgba(34,34,34,0.08)] transition-all",
            isFamily ? "px-5 py-5" : "px-4 py-4",
            task.done && "opacity-60",
          )}
        >
          <div className="min-w-0 max-w-full flex-1 overflow-hidden">
            <p
              className={cn(
                "break-words font-medium leading-snug text-foreground transition-all",
                isFamily ? "text-[23px] tracking-tight" : "text-[15px]",
                task.done && "line-through decoration-foreground/50 decoration-[1.25px] text-foreground/60",
              )}
            >
              {task.title}
            </p>
            {task.note && task.note.trim() && (
              <p
                className={cn(
                  "break-words leading-relaxed text-foreground/60 transition-all",
                  isFamily ? "mt-1.5 text-[15px]" : "mt-1 text-[12.5px] text-muted-foreground",
                  task.done && "line-through decoration-foreground/40",
                )}
              >
                {task.note}
              </p>
            )}

            {task.image_url && (
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                aria-label="查看行程截图大图"
                className={cn(
                  "group/img mt-2 block overflow-hidden rounded-lg border border-foreground/10 bg-neutral-50 transition-all hover:border-primary/40 hover:shadow-md active:scale-[0.98]",
                  isFamily ? "h-28 w-28" : "h-16 w-16",
                )}
              >
                <img
                  src={task.image_url}
                  alt="行程截图缩略图"
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform group-hover/img:scale-105"
                />
              </button>
            )}

            {task.creator_id && task.owner_id && task.creator_id !== task.owner_id && (
              <p
                className={cn(
                  "mt-1.5 text-foreground/40",
                  isFamily ? "text-[12px]" : "text-[10px]",
                )}
              >
                来自 {getMockUserById(task.creator_id)?.label ?? "同事"} 的协同指派
              </p>
            )}





          </div>

          {isFamily ? (
            <button
              type="button"
              aria-label={task.done ? "标记为未闭环" : "标记为已闭环"}
              onClick={() => onToggle(task.id)}
              className={cn(
                "shrink-0 self-center rounded-2xl px-5 py-4 text-[19px] font-bold tracking-[0.12em] transition-all active:scale-[0.97]",
                task.done
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "bg-primary text-primary-foreground shadow-[0_8px_24px_-10px_rgba(107,122,106,0.65)] hover:bg-primary/90",
              )}
            >
              {task.done ? "✓ 已闭环" : "确认闭环"}
            </button>
          ) : (
            <div className="flex flex-col items-center gap-2">
              {isPlanner && onDelete && (
                <Popover open={confirmOpen} onOpenChange={setConfirmOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label="删除日程"
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-foreground/40 transition-all hover:bg-red-50 hover:text-red-400 active:scale-95"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    sideOffset={4}
                    className="w-52 rounded-xl border-foreground/10 bg-card p-3 shadow-[0_8px_30px_-12px_rgba(34,34,34,0.18)]"
                  >
                    <p className="text-[12.5px] font-medium text-foreground">
                      确定要删除这条日程吗？
                    </p>
                    <div className="mt-2.5 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmOpen(false)}
                        className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-foreground/60 transition-all hover:bg-foreground/5 hover:text-foreground"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmOpen(false);
                          onDelete(task.id);
                        }}
                        className="rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-medium text-red-500 transition-all hover:bg-red-100"
                      >
                        确定删除
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              <button
                type="button"
                aria-label={task.done ? "标记为未闭环" : "标记为已闭环"}
                onClick={() => onToggle(task.id)}
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-foreground/70 bg-background transition-all",
                  "hover:border-primary hover:bg-primary/5 active:scale-95",
                  task.done && "border-primary bg-primary text-primary-foreground hover:bg-primary",
                )}
              >
                <Check
                  className={cn(
                    "h-3.5 w-3.5 stroke-[2.25] transition-opacity",
                    task.done ? "opacity-100" : "opacity-0",
                  )}
                />
              </button>
            </div>
          )}
        </div>

        {/* —— Glanceable mode: 只展示已就位的批注 / 状态签收，不暴露繁琐控件 —— */}
        {isFamily && (activeTagLabel || comment) && (
          <div className="mt-2 ml-1 flex flex-wrap items-center gap-2">
            {activeTagLabel && (
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[14px] font-medium tracking-tight text-primary">
                {activeTagLabel}
              </span>
            )}
            {comment && (
              <span className="rounded-full bg-foreground/[0.06] px-3 py-1 text-[14px] text-foreground/75">
                📝 {comment}
              </span>
            )}
          </div>
        )}

        {/* —— Console mode: 完整的快捷批注 / 反馈系统 —— */}
        {!isFamily && (
          <div className="mt-2 ml-1 flex flex-wrap items-center gap-1.5">
            {FEEDBACK_TAGS.map((t) => {
              const active = feedbackTag === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => pickTag(t.key)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10.5px] tracking-tight transition-all active:scale-95",
                    active
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-foreground/10 bg-card text-foreground/55 hover:border-foreground/25 hover:text-foreground/80",
                  )}
                >
                  {t.label}
                </button>
              );
            })}

            <Popover open={commentOpen} onOpenChange={(o) => { setCommentOpen(o); if (o) setCommentDraft(comment); }}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] tracking-tight transition-all active:scale-95",
                    comment
                      ? "border-foreground/20 bg-foreground/[0.04] text-foreground/80"
                      : "border-dashed border-foreground/15 bg-transparent text-foreground/45 hover:border-foreground/30 hover:text-foreground/70",
                  )}
                  aria-label="添加批注"
                >
                  <MessageSquarePlus className="h-3 w-3" />
                  {comment ? comment : "添加批注"}
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={6}
                className="w-64 rounded-xl border-foreground/10 bg-card p-3 shadow-[0_8px_30px_-12px_rgba(34,34,34,0.18)]"
              >
                <p className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-foreground/55">
                  快捷批注
                </p>
                <input
                  autoFocus
                  type="text"
                  value={commentDraft}
                  maxLength={80}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); saveComment(); }
                  }}
                  placeholder="如：需准备 B 版 PPT"
                  className="mt-2 w-full rounded-md border border-foreground/15 bg-background px-2.5 py-1.5 text-[12.5px] text-foreground placeholder:text-foreground/35 focus:border-primary focus:outline-none"
                />
                <div className="mt-2.5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setCommentDraft(""); saveComment(); }}
                    className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-foreground/55 transition-all hover:bg-foreground/5 hover:text-foreground"
                  >
                    清除
                  </button>
                  <button
                    type="button"
                    onClick={saveComment}
                    className="rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-medium text-primary-foreground transition-all hover:bg-primary/90"
                  >
                    钉上批注
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>
    </div>
  );
}
