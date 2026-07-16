import { useState } from "react";
import { Inbox, ChevronDown, Check, AlarmClockOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getContactLabel } from "@/lib/contacts";
import { ImageLightbox } from "./ImageLightbox";
import { ConflictModal } from "./ConflictModal";

export interface PendingTask {
  id: string;
  time: string;
  title: string;
  note?: string | null;
  image_url?: string | null;
  execution_date?: string | null;
  creator_id?: string | null;
  owner_id?: string | null;
}

interface Props {
  tasks: PendingTask[];
  onChanged?: () => void;
  onOptimisticAccept?: (task: PendingTask) => void;
  onOptimisticConflict?: (task: PendingTask) => void;
}

function formatExecDate(iso?: string | null): { label: string; tone: "today" | "tomorrow" | "future" | "past" } | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const today = new Date();
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const [y, m, d] = iso.split("-").map(Number);
  const t1 = new Date(y, m - 1, d).getTime();
  const diff = Math.round((t1 - t0) / 86400000);
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  if (diff === 0) return { label: `今天 ${mm}/${dd}`, tone: "today" };
  if (diff === 1) return { label: `明天 ${mm}/${dd}`, tone: "tomorrow" };
  if (diff < 0) return { label: `${mm}/${dd}`, tone: "past" };
  return { label: `${mm}/${dd}`, tone: "future" };
}

export function PendingInbox({ tasks, onChanged, onOptimisticAccept, onOptimisticConflict }: Props) {
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (tasks.length === 0) return null;

  function accept(task: PendingTask) {
    setBusyId(task.id);
    // 🚀 乐观更新：父组件立刻把卡片从气泡移除并塞进主时间轴
    onOptimisticAccept?.(task);
    supabase
      .from("tasks")
      .update({ flow_status: "accepted", feedback_tag: "received" })
      .eq("id", task.id)
      .then(({ error }) => {
        setBusyId((b) => (b === task.id ? null : b));
        if (error) onChanged?.();
      });
  }

  function conflict(task: PendingTask) {
    setBusyId(task.id);
    onOptimisticConflict?.(task);
    supabase
      .from("tasks")
      .update({ feedback_tag: "conflict" })
      .eq("id", task.id)
      .then(({ error }) => {
        setBusyId((b) => (b === task.id ? null : b));
        if (error) onChanged?.();
      });
  }

  return (
    <div className="mx-6 mt-2 overflow-hidden rounded-2xl border border-amber-300/40 bg-gradient-to-br from-amber-50 via-amber-50/70 to-orange-50/60 shadow-[0_4px_18px_-8px_rgba(217,119,6,0.18)]">
      <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5">
          <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/15 text-amber-700">
            <Inbox className="h-3.5 w-3.5" />
            <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold leading-none text-white shadow-sm">
              {tasks.length}
            </span>
          </span>
          <div className="leading-tight">
            <p className="text-[12.5px] font-semibold text-amber-900">
              收到 {tasks.length} 项来自同事的协同日程
            </p>
            <p className="text-[10px] text-amber-800/70">
              请确认是否纳入今日时间轴
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-amber-700/70 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <ul className="divide-y divide-amber-200/60 border-t border-amber-200/60 bg-white/55">
          {tasks.map((t) => {
            const creatorLabel = getContactLabel(t.creator_id);
            const isMine = t.creator_id === t.owner_id;
            const dateInfo = formatExecDate(t.execution_date);
            return (
              <li key={t.id} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex shrink-0 flex-col items-center gap-0.5">
                    {dateInfo && (
                      <span
                        className={cn(
                          "rounded-t-md px-1.5 pt-0.5 text-[9.5px] font-semibold leading-tight tracking-tight",
                          dateInfo.tone === "today" && "bg-amber-500/15 text-amber-800",
                          dateInfo.tone === "tomorrow" && "bg-orange-500/20 text-orange-800",
                          dateInfo.tone === "future" && "bg-amber-500/10 text-amber-700/80",
                          dateInfo.tone === "past" && "bg-foreground/5 text-foreground/45",
                        )}
                      >
                        {dateInfo.label}
                      </span>
                    )}
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-bold tracking-[0.06em] text-amber-800",
                        dateInfo && "rounded-t-none",
                      )}
                    >
                      {t.time}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-[13px] font-medium leading-snug text-foreground">
                      {t.title}
                    </p>
                    {t.note && (
                      <p className="mt-0.5 break-words text-[11px] leading-relaxed text-muted-foreground">
                        {t.note}
                      </p>
                    )}
                    {!isMine && (
                      <p className="mt-1 text-[10px] text-foreground/45">
                        来自 {creatorLabel} 的协同指派
                      </p>
                    )}
                    {t.image_url && (
                      <button
                        type="button"
                        onClick={() => setLightbox(t.image_url!)}
                        className="mt-1.5 block h-14 w-14 overflow-hidden rounded-md border border-foreground/10 transition-transform hover:scale-[1.03]"
                      >
                        <img
                          src={t.image_url}
                          alt="协同行程截图"
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-2.5 flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => conflict(t)}
                    disabled={busyId === t.id}
                    className="inline-flex items-center gap-1 rounded-full border border-foreground/10 bg-card px-2.5 py-1 text-[10.5px] font-medium text-foreground/65 transition-all hover:border-foreground/25 hover:text-foreground/85 active:scale-95 disabled:opacity-50"
                  >
                    <AlarmClockOff className="h-3 w-3" />
                    时间冲突
                  </button>
                  <button
                    type="button"
                    onClick={() => accept(t)}
                    disabled={busyId === t.id}
                    className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10.5px] font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50"
                  >
                    <Check className="h-3 w-3 stroke-[2.5]" />
                    收到 · 纳入时间轴
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {!open && (
        <div className="flex items-center justify-end gap-1.5 border-t border-amber-200/60 bg-white/40 px-4 py-1.5">
          <span className="text-[10px] text-amber-800/60">
            点击展开 · 当前账号 {getContactLabel(tasks[0]?.owner_id, "我")}
          </span>
        </div>
      )}
    </div>
  );
}
