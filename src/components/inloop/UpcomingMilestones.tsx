import { useState } from "react";
import { ChevronDown, CalendarClock, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "./TaskItem";

interface Props {
  milestones: Task[];
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("zh-CN", { month: "long", day: "numeric" });
}

export function UpcomingMilestones({ milestones }: Props) {
  const [open, setOpen] = useState(false);

  const sorted = [...milestones].sort(
    (a, b) => (a.execution_date ?? "").localeCompare(b.execution_date ?? ""),
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-foreground/25 bg-card/60 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex min-w-0 items-center gap-2">
          <CalendarClock className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate text-[10.5px] font-medium tracking-[0.14em] text-foreground/70">
            未来重要日程
          </span>
          <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            {sorted.length}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-foreground/50 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="border-t border-foreground/10">
          {sorted.length === 0 ? (
            <p className="px-4 py-5 text-center text-[12px] leading-relaxed text-foreground/45">
              暂无未来日程，支持在上方输入「下个月15号打疫苗」自动捕获
            </p>
          ) : (
            <ul className="space-y-2 px-3 py-3">
              {sorted.map((m) => {
                const days = m.execution_date ? daysUntil(m.execution_date) : 0;
                return (
                  <li
                    key={m.id}
                    className="rounded-xl border border-foreground/[0.08] bg-background/80 px-3.5 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-foreground/55">
                          {m.execution_date && formatDate(m.execution_date)} · {m.time}
                        </p>
                        <p className="mt-1 break-words text-[14px] font-medium leading-snug text-foreground">
                          {m.title}
                        </p>
                        {m.note && (
                          <p className="mt-1 break-words text-[11.5px] leading-relaxed text-muted-foreground">
                            {m.note}
                          </p>
                        )}
                        {m.link && (
                          <a
                            href={m.link}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1.5 flex max-w-full items-start gap-1 rounded-md bg-primary/8 px-1.5 py-1 text-[10.5px] font-medium text-primary"
                          >
                            <Link2 className="mt-0.5 h-2.5 w-2.5 shrink-0" />
                            <span className="min-w-0 flex-1 break-all">
                              {m.link.replace(/^https?:\/\//, "")}
                            </span>
                          </a>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[22px] font-semibold leading-none tracking-tight text-foreground">
                          {days}
                        </p>
                        <p className="mt-0.5 text-[9.5px] tracking-[0.08em] text-foreground/50">
                          {days === 0 ? "今天" : `还剩 ${days} 天`}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
