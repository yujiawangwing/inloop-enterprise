import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Repeat, LogOut, UserPlus, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { contactAvatarClass, contactInitial, type Contact } from "@/lib/contacts";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  displayName: string;
  email: string | null;
  phone: string | null;
  teamContacts: Contact[];
  onOpenTeamManager: () => void;
  onSignOut: () => void | Promise<void>;
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

export function SideDrawer({
  open,
  onOpenChange,
  displayName,
  email,
  phone,
  teamContacts,
  onOpenTeamManager,
  onSignOut,
}: Props) {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [showRoutines, setShowRoutines] = useState(false);
  const [newTime, setNewTime] = useState("08:00");
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    if (!open) return;
    supabase
      .from("routines")
      .select("id, time, title, note, active, recurrence_type, recurrence_days")
      .order("time", { ascending: true })
      .then(({ data }) => setRoutines(data ?? []));
  }, [open, showRoutines]);

  async function addRoutine() {
    if (!newTitle.trim()) return;
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) {
      alert("登录态已失效，请重新登录");
      return;
    }
    const { data, error } = await supabase
      .from("routines")
      .insert({
        time: newTime,
        title: newTitle.trim(),
        active: true,
        recurrence_type: "daily",
        recurrence_days: [1, 2, 3, 4, 5, 6, 7],
        user_id: uid,
        owner_id: uid,
        creator_id: uid,
        flow_status: "accepted",
      })
      .select("id, time, title, note, active, recurrence_type, recurrence_days")
      .single();

    if (error) {
      console.warn("addRoutine failed:", error);
      return;
    }
    if (data) {
      setRoutines((r) => [...r, data].sort((a, b) => a.time.localeCompare(b.time)));
      setNewTitle("");
    }
  }

  async function removeRoutine(id: string) {
    await supabase.from("routines").delete().eq("id", id);
    setRoutines((r) => r.filter((x) => x.id !== id));
  }

  const contact = email || phone || "未绑定联系方式";

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
            个人 · 团队设置中心
          </SheetDescription>
        </SheetHeader>

        <div className="flex h-[calc(100vh-110px)] flex-col overflow-y-auto px-6 py-6">
          {showRoutines ? (
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
                    placeholder="例：晨会同步"
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
              {/* 个人中心 */}
              <section>
                <h3 className="text-[10.5px] font-medium uppercase tracking-[0.2em] text-foreground/55">
                  个人中心
                </h3>
                <div className="mt-3 rounded-2xl border border-foreground/10 bg-gradient-to-br from-primary/[0.06] via-card to-card p-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold",
                        contactAvatarClass(displayName),
                      )}
                    >
                      {contactInitial(displayName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14.5px] font-semibold tracking-tight text-foreground">
                        {displayName}
                      </p>
                      <p className="mt-0.5 truncate text-[11.5px] leading-snug text-muted-foreground">
                        {contact}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSignOut()}
                    className="mt-3.5 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-foreground/12 bg-background/70 py-2 text-[12px] font-medium tracking-wide text-foreground/75 transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-600 active:scale-[0.98]"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    退出登录
                  </button>
                </div>
              </section>

              {/* 团队管理 */}
              <section className="mt-7">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10.5px] font-medium uppercase tracking-[0.2em] text-foreground/55">
                    我的团队 · {teamContacts.length}
                  </h3>
                  <button
                    type="button"
                    onClick={onOpenTeamManager}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary transition-all hover:bg-primary/15 active:scale-95"
                  >
                    <UserPlus className="h-3 w-3" />
                    添加成员
                  </button>
                </div>

                <div className="mt-3 space-y-1.5">
                  {teamContacts.length === 0 ? (
                    <button
                      type="button"
                      onClick={onOpenTeamManager}
                      className="flex w-full items-center gap-2.5 rounded-xl border border-dashed border-foreground/15 bg-card/40 px-3.5 py-4 text-left transition-all hover:border-primary/40 hover:bg-primary/[0.04]"
                    >
                      <Users className="h-4 w-4 shrink-0 text-foreground/40" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12.5px] font-medium text-foreground">
                          还没有团队成员
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                          通过对方的邮箱 / 手机号添加，即可协同派发日程
                        </span>
                      </span>
                    </button>
                  ) : (
                    teamContacts.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center gap-3 rounded-xl border border-foreground/8 bg-card px-3 py-2.5"
                      >
                        <span
                          className={cn(
                            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold",
                            contactAvatarClass(c.id),
                          )}
                        >
                          {contactInitial(c.display_name)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                          {c.display_name}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* 常规任务库 */}
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

              <div className="mt-auto pt-8">
                <p className="text-center text-[9.5px] tracking-[0.22em] text-muted-foreground">
                  INLOOP ENTERPRISE
                </p>
              </div>
            </>
          )}
        </div>
        {/* keep icon import balance for tree-shaking safety */}
        <span className="hidden"><X className="h-0 w-0" /></span>
      </SheetContent>
    </Sheet>
  );
}
