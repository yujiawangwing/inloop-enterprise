import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Repeat, Smartphone, Users, ClipboardList, Copy, Check, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Mode } from "./ModeSwitch";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mode: Mode;
  onModeChange: (m: Mode) => void;
  isPro?: boolean;
  onTogglePro?: (v: boolean) => void;
  onRequestPaywall?: () => void;
  voiceAlarmOn?: boolean;
  onVoiceAlarmChange?: (v: boolean) => void;
}

interface Routine {
  id: string;
  time: string;
  title: string;
  note: string | null;
  active: boolean;
  recurrence_type?: string | null;
  recurrence_days?: number[] | null;
}

const DAY_NAMES = ["一", "二", "三", "四", "五", "六", "日"];
function formatRecurrence(r: Pick<Routine, "recurrence_type" | "recurrence_days">): string {
  const days = r.recurrence_days ?? [];
  if (!days.length || days.length === 7) return "每天";
  if (r.recurrence_type === "weekly" || days.length < 7) {
    return `每周${days.filter((n) => n >= 1 && n <= 7).sort().map((n) => DAY_NAMES[n - 1]).join("")}`;
  }
  return "每天";
}


const SYNC_CODE = "IL-8839";
const DEVICES = [
  { name: "控制台 · iPhone 15 Pro", role: "planner" },
  { name: "桌面 iPad · 核心日程看板", role: "family" },
];

export function SideDrawer({ open, onOpenChange, mode, onModeChange, isPro = false, onTogglePro, onRequestPaywall, voiceAlarmOn = true, onVoiceAlarmChange }: Props) {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [showRoutines, setShowRoutines] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newTime, setNewTime] = useState("08:00");
  const [newTitle, setNewTitle] = useState("");
  const [dbStatus, setDbStatus] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const hasEnv = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (!hasEnv) {
          if (!cancelled) setDbStatus("offline");
          return;
        }
        const { error } = await supabase.from("routines").select("id").limit(1);
        if (!cancelled) setDbStatus(error ? "offline" : "online");
      } catch {
        if (!cancelled) setDbStatus("offline");
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (!open || mode !== "planner") return;
    supabase
      .from("routines")
      .select("id, time, title, note, active, recurrence_type, recurrence_days")
      .order("time", { ascending: true })
      .then(({ data }) => setRoutines(data ?? []));
  }, [open, mode, showRoutines]);

  async function addRoutine() {
    if (!newTitle.trim()) return;
    const { data } = await supabase
      .from("routines")
      .insert({
        time: newTime,
        title: newTitle.trim(),
        active: true,
        recurrence_type: "daily",
        recurrence_days: [1, 2, 3, 4, 5, 6, 7],
      })
      .select("id, time, title, note, active, recurrence_type, recurrence_days")
      .single();

    if (data) {
      setRoutines((r) => [...r, data].sort((a, b) => a.time.localeCompare(b.time)));
      setNewTitle("");
    }
  }

  async function removeRoutine(id: string) {
    await supabase.from("routines").delete().eq("id", id);
    setRoutines((r) => r.filter((x) => x.id !== id));
  }

  function copy() {
    navigator.clipboard?.writeText(SYNC_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[88vw] max-w-[360px] border-r border-foreground/10 bg-background p-0"
      >
        <SheetHeader className="space-y-1 border-b border-foreground/8 px-6 pb-5 pt-7 text-left">
          <SheetTitle className="text-[20px] font-semibold tracking-tight text-foreground">
            Inloop
          </SheetTitle>
          <SheetDescription className="text-[10.5px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            设备菜单 · MENU
          </SheetDescription>
        </SheetHeader>

        <div className="flex h-[calc(100vh-110px)] flex-col overflow-y-auto px-6 py-6">
          {showRoutines && mode === "planner" ? (
            <div>
              <button
                onClick={() => setShowRoutines(false)}
                className="mb-5 text-[11px] tracking-[0.14em] text-foreground/55 hover:text-foreground"
              >
                ← 返回菜单
              </button>
              <h3 className="text-[10.5px] font-medium uppercase tracking-[0.2em] text-foreground/55">
                常规任务库
              </h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                全局常驻任务模板。系统会根据每条的循环规则，在对应星期自动注入到当日时间轴。
              </p>

              <div className="mt-5 space-y-2">
                {routines.length === 0 && (
                  <p className="rounded-xl border border-dashed border-foreground/15 px-4 py-6 text-center text-[12px] text-foreground/45">
                    暂无常规任务
                  </p>
                )}
                {routines.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-foreground/8 bg-card px-3.5 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] font-medium tracking-[0.14em] text-primary">
                          {r.time}
                        </p>
                        <span className="inline-flex items-center rounded-full bg-[#7A9B76]/15 px-1.5 py-[1px] text-[9.5px] font-medium tracking-[0.05em] text-[#5d7c5a]">
                          🔁 {formatRecurrence(r)}
                        </span>
                      </div>
                      <p className="mt-0.5 break-words text-[13.5px] font-medium text-foreground">
                        {r.title}
                      </p>
                    </div>
                    <button
                      onClick={() => removeRoutine(r.id)}
                      className="shrink-0 text-[11px] tracking-wide text-foreground/50 hover:text-foreground"
                    >
                      移除
                    </button>
                  </div>

                ))}
              </div>

              <div className="mt-5 rounded-xl border border-foreground/12 bg-card p-3.5">
                <p className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-foreground/60">
                  新增常规
                </p>
                <div className="mt-2.5 flex gap-2">
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-[88px] rounded-md border border-foreground/15 bg-background px-2 py-1.5 text-[12.5px] text-foreground focus:border-primary focus:outline-none"
                  />
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="例：补维 D"
                    className="min-w-0 flex-1 rounded-md border border-foreground/15 bg-background px-2.5 py-1.5 text-[12.5px] text-foreground placeholder:text-foreground/35 focus:border-primary focus:outline-none"
                  />
                </div>
                <button
                  onClick={addRoutine}
                  disabled={!newTitle.trim()}
                  className="mt-2.5 w-full rounded-full bg-primary py-2 text-[12px] font-medium tracking-wide text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-foreground/15"
                >
                  加入常规库
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Mode selector */}
              <section>
                <h3 className="text-[10.5px] font-medium uppercase tracking-[0.2em] text-foreground/55">
                  设备模式
                </h3>
                <div className="mt-3 space-y-2">
                  {[
                    { v: "planner" as const, label: "控制台模式", desc: "发布端：编排日程、AI 智能输入", Icon: Smartphone },
                    { v: "family" as const, label: "看板模式", desc: "远视聚焦：放大核心时间块与截图缩略", Icon: Users },
                  ].map(({ v, label, desc, Icon }) => {
                    const active = mode === v;
                    return (
                      <button
                        key={v}
                        onClick={() => onModeChange(v)}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-all",
                          active
                            ? "border-primary/60 bg-primary/[0.06]"
                            : "border-foreground/10 bg-card hover:border-foreground/25",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-1 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border",
                            active ? "border-primary" : "border-foreground/30",
                          )}
                        >
                          {active && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                        </span>
                        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground/70" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13.5px] font-medium tracking-tight text-foreground">
                            {label}
                          </p>
                          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                            {desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Voice alarm toggle */}
              <section className="mt-7">
                <h3 className="text-[10.5px] font-medium uppercase tracking-[0.2em] text-foreground/55">
                  到点语音强提醒
                </h3>
                <button
                  type="button"
                  onClick={() => onVoiceAlarmChange?.(!voiceAlarmOn)}
                  className={cn(
                    "mt-3 flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3.5 text-left transition-all",
                    voiceAlarmOn
                      ? "border-amber-500/40 bg-amber-50/60 hover:border-amber-500/60"
                      : "border-foreground/10 bg-card hover:border-foreground/25",
                  )}
                  aria-pressed={voiceAlarmOn}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2.5">
                    {voiceAlarmOn ? (
                      <Volume2 className="h-4 w-4 shrink-0 text-amber-600" />
                    ) : (
                      <VolumeX className="h-4 w-4 shrink-0 text-foreground/45" />
                    )}
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-medium tracking-tight text-foreground">
                        {voiceAlarmOn ? "🔊 到点语音强提醒已开启" : "🔇 静默通知模式"}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                        {voiceAlarmOn
                          ? "到点自动语音播报 + 全屏唤醒查看端"
                          : "仅弹窗显示，不出声不打扰"}
                      </span>
                    </span>
                  </span>
                  <span
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                      voiceAlarmOn ? "bg-amber-500" : "bg-foreground/20",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                        voiceAlarmOn ? "translate-x-[18px]" : "translate-x-[2px]",
                      )}
                    />
                  </span>
                </button>
              </section>

              {/* Routines (planner only) */}
              {mode === "planner" && (
                <section className="mt-7">
                  <h3 className="text-[10.5px] font-medium uppercase tracking-[0.2em] text-foreground/55">
                    规划管理
                  </h3>
                  <button
                    onClick={() => setShowRoutines(true)}
                    className="mt-3 flex w-full items-center justify-between gap-3 rounded-xl border border-foreground/10 bg-card px-3.5 py-3.5 transition-all hover:border-foreground/25"
                  >
                    <span className="flex items-center gap-2.5">
                      <Repeat className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[13.5px] font-medium tracking-tight text-foreground">
                        常规任务库
                      </span>
                    </span>
                    <span className="text-[16px] text-foreground/40">›</span>
                  </button>
                </section>
              )}

              {/* Sync code */}
              <section className="mt-7">
                <h3 className="text-[10.5px] font-medium uppercase tracking-[0.2em] text-foreground/55">
                  多端联动同步
                </h3>
                <div className="mt-3 rounded-xl border border-foreground/10 bg-card p-4">
                  <p className="text-[10.5px] tracking-[0.14em] text-muted-foreground">
                    空间同步码
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="font-mono text-[22px] font-semibold tracking-[0.18em] text-foreground">
                      {SYNC_CODE}
                    </span>
                    <button
                      onClick={copy}
                      className="ml-auto inline-flex items-center gap-1 rounded-full border border-foreground/15 px-2.5 py-1 text-[10.5px] tracking-wide text-foreground/70 transition-all hover:bg-foreground/5"
                    >
                      {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                      {copied ? "已复制" : "复制"}
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    查看端打开 Inloop 输入此码，即可一键接入此工作空间。
                  </p>

                  <div className="mt-4 space-y-1.5 border-t border-foreground/8 pt-3">
                    <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-foreground/55">
                      已连接设备
                    </p>
                    {DEVICES.map((d) => (
                      <div key={d.name} className="flex items-center gap-2 py-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        <span className="text-[12px] text-foreground/80">{d.name}</span>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        // Simulated 3rd device bind attempt
                        if (!isPro) {
                          onRequestPaywall?.();
                        }
                      }}
                      className="mt-2 w-full rounded-full border border-dashed border-foreground/20 py-1.5 text-[11px] tracking-wide text-foreground/55 transition-all hover:border-foreground/35 hover:text-foreground/80"
                    >
                      + 绑定新设备
                    </button>
                    {!isPro && (
                      <p className="pt-1 text-[10px] leading-snug text-foreground/40">
                        免费版最多支持绑定 2 台设备
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* DB status indicator */}
              <div className="mt-6 flex items-center justify-center gap-1.5 text-[10px] tracking-wide text-foreground/45">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    dbStatus === "online"
                      ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]"
                      : dbStatus === "offline"
                      ? "bg-red-500"
                      : "bg-foreground/30 animate-pulse",
                  )}
                />
                <span>
                  数据库状态：
                  {dbStatus === "online"
                    ? "已连接云端同步"
                    : dbStatus === "offline"
                    ? "本地离线模式"
                    : "检测中…"}
                </span>
              </div>

              {/* Dev test toggle */}
              <div className="mt-3 rounded-lg border border-dashed border-foreground/12 px-3 py-2.5">
                <p className="text-[9.5px] font-medium uppercase tracking-[0.18em] text-foreground/40">
                  Dev · 测试切换
                </p>
                <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => onTogglePro?.(true)}
                    className={cn(
                      "rounded-full px-2 py-0.5 transition-all",
                      isPro ? "bg-primary/15 text-primary" : "text-foreground/55 hover:text-foreground",
                    )}
                  >
                    模拟 Pro 身份
                  </button>
                  <span className="text-foreground/25">/</span>
                  <button
                    type="button"
                    onClick={() => onTogglePro?.(false)}
                    className={cn(
                      "rounded-full px-2 py-0.5 transition-all",
                      !isPro ? "bg-foreground/10 text-foreground" : "text-foreground/55 hover:text-foreground",
                    )}
                  >
                    模拟免费身份
                  </button>
                </div>
              </div>

              <div className="mt-auto pt-8">
                <p className="text-center text-[9.5px] tracking-[0.22em] text-muted-foreground">
                  HIGH-IQ FAMILY · INLOOP {isPro && "· PRO"}
                </p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
