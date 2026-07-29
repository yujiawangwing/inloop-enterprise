import { cn } from "@/lib/utils";
import { Check, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEffect, useState } from "react";
import { ImageLightbox } from "./ImageLightbox";
import { supabase } from "@/integrations/supabase/client";
import { getContactLabel } from "@/lib/contacts";

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
  onDelete?: (id: string) => void;
}

export function TaskItem({ task, onToggle, onDelete }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [feedbackTag, setFeedbackTag] = useState<string | null>(task.feedback_tag ?? null);
  const [comment, setComment] = useState<string>(task.comment ?? "");
  const isVirtual = task.id.startsWith("vr-");

  useEffect(() => {
    setFeedbackTag(task.feedback_tag ?? null);
    setComment(task.comment ?? "");
  }, [task.feedback_tag, task.comment]);

  // kept for potential future inline feedback; currently unused in console view
  void feedbackTag;
  void setFeedbackTag;
  void isVirtual;
  void supabase;

  return (
    <div className="relative flex items-stretch gap-4">
      <ImageLightbox
        src={lightboxOpen ? task.image_url ?? null : null}
        onClose={() => setLightboxOpen(false)}
      />
      {/* timeline rail */}
      <div className="flex shrink-0 w-14 flex-col items-end pt-5">
        <div className="flex flex-col items-end gap-0.5">
          {(() => {
            if (!task.execution_date || !/^\d{4}-\d{2}-\d{2}$/.test(task.execution_date)) return null;
            const today = new Date();
            const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
            const [y, m, d] = task.execution_date.split("-").map(Number);
            const t1 = new Date(y, m - 1, d).getTime();
            const diff = Math.round((t1 - t0) / 86400000);
            if (diff === 0) return null;
            const mm = String(m).padStart(2, "0");
            const dd = String(d).padStart(2, "0");
            const label = diff === 1 ? `明天 ${mm}/${dd}` : `${mm}/${dd}`;
            return (
              <span
                className={cn(
                  "rounded-sm px-1 text-[9.5px] font-medium leading-tight tracking-tight",
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
              "inline-flex items-center gap-1 text-[11px] font-medium tracking-[0.14em] text-foreground/70 transition-opacity",
              task.done && "opacity-40",
            )}
          >
            {task.type === "routine" && (
              <span
                aria-hidden
                title="常规循环任务"
                className="inline-block h-[5px] w-[5px] rounded-full bg-[#7A9B76]"
              />
            )}
            {task.time}
          </span>
        </div>
      </div>

      <div className="relative min-w-0 flex-1 overflow-hidden pb-3">
        <span
          aria-hidden
          className="absolute -left-[1.125rem] top-6 bottom-0 w-px bg-foreground/15"
        />
        <span
          aria-hidden
          className={cn(
            "absolute -left-[1.3125rem] top-[1.4rem] h-1.5 w-1.5 rounded-full border border-foreground/60 bg-background",
            task.done && "bg-primary border-primary",
          )}
        />

        <div
          className={cn(
            "group flex w-full min-w-0 max-w-full items-start justify-between gap-4 overflow-hidden rounded-xl border border-foreground/[0.06] bg-card px-4 py-4 shadow-[0_1px_2px_rgba(34,34,34,0.04),0_8px_24px_-12px_rgba(34,34,34,0.08)] transition-all",
            task.done && "opacity-60",
          )}
        >
          <div className="min-w-0 max-w-full flex-1 overflow-hidden">
            <p
              className={cn(
                "break-words text-[15px] font-medium leading-snug text-foreground transition-all",
                task.done && "line-through decoration-foreground/50 decoration-[1.25px] text-foreground/60",
              )}
            >
              {task.title}
            </p>
            {task.note && task.note.trim() && (
              <p
                className={cn(
                  "mt-1 break-words text-[12.5px] leading-relaxed text-muted-foreground transition-all",
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
                className="group/img mt-2 block h-16 w-16 overflow-hidden rounded-lg border border-foreground/10 bg-neutral-50 transition-all hover:border-primary/40 hover:shadow-md active:scale-[0.98]"
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
              <p className="mt-1.5 text-[10px] text-foreground/40">
                来自 {getContactLabel(task.creator_id)} 的协同指派
              </p>
            )}

            {comment && (
              <p className="mt-1.5 text-[11px] text-foreground/55">📝 {comment}</p>
            )}
          </div>

          <div className="flex flex-col items-center gap-2">
            {onDelete && (
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
        </div>
      </div>
    </div>
  );
}
