import { cn } from "@/lib/utils";
import { Check, Link2, Trash2 } from "lucide-react";
import type { Mode } from "./ModeSwitch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState } from "react";
import { ImageLightbox } from "./ImageLightbox";

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
}

interface Props {
  task: Task;
  onToggle: (id: string) => void;
  mode: Mode;
  onDelete?: (id: string) => void;
}

export function TaskItem({ task, onToggle, mode, onDelete }: Props) {
  const isFamily = mode === "family";
  const isPlanner = mode === "planner";
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

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
        <span
          className={cn(
            "inline-flex items-center gap-1 font-medium tracking-[0.14em] text-foreground/70 transition-opacity",
            isFamily ? "text-[15px]" : "text-[11px]",
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
                isFamily ? "text-[21px] tracking-tight" : "text-[15px]",
                task.done && "line-through decoration-foreground/50 decoration-[1.25px] text-foreground/60",
              )}
            >
              {task.title}
            </p>
            {task.note && !isFamily && (
              <p
                className={cn(
                  "mt-1 break-words text-[12.5px] leading-relaxed text-muted-foreground transition-all",
                  task.done && "line-through decoration-foreground/40",
                )}
              >
                {task.note}
              </p>
            )}

            {task.link && !isFamily && (
              <a
                href={task.link}
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex w-full max-w-full items-center gap-1.5 overflow-hidden rounded-md bg-primary/8 px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/15"
              >
                <Link2 className="h-3 w-3 shrink-0" />
                <span className="block w-full min-w-0 flex-1 truncate">
                  {task.link.replace(/^https?:\/\//, "")}
                </span>
              </a>
            )}

            {/* Planner-mode status label */}
            {!isFamily && (
              <div className="mt-3 flex items-center gap-2">
                <span
                  aria-hidden
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    task.done ? "bg-primary" : "bg-foreground/30",
                  )}
                />
                <span
                  className={cn(
                    "text-[10.5px] font-medium tracking-[0.08em]",
                    task.done ? "text-primary" : "text-foreground/55",
                  )}
                >
                  {task.done ? "已完成" : "待处理"}
                </span>
              </div>
            )}
          </div>


          {isFamily ? (
            <button
              type="button"
              aria-label={task.done ? "Mark as not done" : "Mark as done"}
              onClick={() => onToggle(task.id)}
              className={cn(
                "shrink-0 self-center rounded-2xl px-5 py-4 text-[19px] font-bold tracking-[0.12em] transition-all active:scale-[0.97]",
                task.done
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "bg-primary text-primary-foreground shadow-[0_8px_24px_-10px_rgba(107,122,106,0.65)] hover:bg-primary/90",
              )}
            >
              {task.done ? "✓ 已完成" : "已完成"}
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
                aria-label={task.done ? "Mark as not done" : "Mark as done"}
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

        {/* Family-mode SOP bubble (Pro: link + AI summary) */}
        {isFamily && task.note && (
          <div
            className={cn(
              "mt-3 ml-1 rounded-2xl border border-primary/15 bg-[oklch(0.955_0.012_140)] px-5 py-4 transition-opacity",
              task.done && "opacity-50",
            )}
          >
            <p className="text-[10px] font-medium tracking-[0.14em] text-primary/80">
              💡 AI 提炼要领
            </p>
            <p className="mt-1.5 break-words text-[17px] font-semibold leading-relaxed tracking-tight text-foreground">
              {task.note}
            </p>
            {task.link && (
              <a
                href={task.link}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-[15px] font-medium text-primary underline decoration-primary/40 decoration-[1.5px] underline-offset-[5px] transition-colors hover:decoration-primary"
              >
                🔗 查看原教程/视频
              </a>
            )}
          </div>
        )}

        {/* Family-mode plain link (Free: link only, no AI summary) */}
        {isFamily && task.link && !task.note && (
          <a
            href={task.link}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "mt-2 ml-1 inline-flex items-center gap-1.5 text-[15px] font-medium text-foreground underline decoration-foreground/40 decoration-[1.5px] underline-offset-[5px] transition-colors hover:decoration-foreground",
              task.done && "opacity-50",
            )}
          >
            🔗 查看原教程/视频
          </a>
        )}

      </div>
    </div>
  );
}
