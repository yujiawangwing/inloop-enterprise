import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Menu, Calendar as CalendarIcon } from "lucide-react";
import { TaskItem, type Task, type TaskType } from "@/components/inloop/TaskItem";
import { AddTaskSheet } from "@/components/inloop/AddTaskSheet";
import type { Mode } from "@/components/inloop/ModeSwitch";
import { SideDrawer } from "@/components/inloop/SideDrawer";
import { AIComposer } from "@/components/inloop/AIComposer";
import { VerificationModal } from "@/components/inloop/VerificationModal";
import { ThankYouToast } from "@/components/inloop/ThankYouToast";
import { PaywallModal } from "@/components/inloop/PaywallModal";
import { PendingInbox, type PendingTask } from "@/components/inloop/PendingInbox";
import { type DraftTask } from "@/lib/parseDraft";
import { supabase } from "@/integrations/supabase/client";
import { getMockUserId, logoutMock } from "@/lib/mockAuth";
import { MOCK_USERS, getMockUserById } from "@/lib/mockUsers";
import { LogOut } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { parseDraftWithDeepSeek, type DeepSeekDraft } from "@/lib/deepseek.functions";
import { WakeAlarmOverlay } from "@/components/inloop/WakeAlarmOverlay";
import { useTaskAlarm } from "@/hooks/useTaskAlarm";


const VOICE_KEY = "inloop:voiceAlarm";

async function callDeepSeek(instruction: string, pastedLink: string): Promise<DraftTask[]> {
  // 强行注入用户设备本地时间，避免凌晨 UTC 错位导致 AI 日期解析 -1 天
  const now = new Date();
  const localBaseline = {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    dow: now.getDay() === 0 ? 7 : now.getDay(),
  };
  const arr = (await parseDraftWithDeepSeek({
    data: { instruction, pastedLink, localBaseline },
  })) as DeepSeekDraft[];
  if (!Array.isArray(arr)) {
    throw new Error("DeepSeek 返回值不是 JSON 数组");
  }

  return arr.map<DraftTask>((d, index) => {
    if (!d || !String(d.title ?? "").trim()) {
      throw new Error(`DeepSeek 第 ${index + 1} 条任务缺少 title 字段`);
    }
    const rawTime = String(d.time ?? "").trim();
    const normalizedTime = rawTime.replace(/^(\d):(\d{2})$/, "0$1:$2");
    if (!/^\d{2}:\d{2}$/.test(normalizedTime)) {
      throw new Error(`DeepSeek 第 ${index + 1} 条任务 time 字段无效：${rawTime || "空"}`);
    }
    const isRecurring = Boolean(d.is_recurring);
    let recurrenceType: "daily" | "weekly" | null = null;
    let recurrenceDays: number[] | null = null;
    if (isRecurring) {
      recurrenceType =
        d.recurrence_type === "weekly" ? "weekly" : "daily";
      const days = Array.isArray(d.recurrence_days)
        ? d.recurrence_days.filter((n) => Number.isInteger(n) && n >= 1 && n <= 7)
        : [];
      recurrenceDays =
        recurrenceType === "daily" || days.length === 0
          ? [1, 2, 3, 4, 5, 6, 7]
          : Array.from(new Set(days)).sort();
    }
    // —— 解析 AI 返回的 date 字段 ——
    const todayStr = todayISO();
    const rawDate = String(d.date ?? "").trim();
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : todayStr;
    // 单次任务：若 AI 给出的日期晚于今天，自动归类为 milestone（未来日程）
    const draftType: DraftTask["type"] =
      !isRecurring && validDate > todayStr ? "milestone" : "temporary";
    return {
      type: draftType,
      time: normalizedTime,
      title: String(d.title).slice(0, 80),
      link: d.link ?? undefined,
      note: (d.note && String(d.note).trim()) ? String(d.note).trim() : (d.ai_summary ?? undefined),
      execution_date: validDate,
      is_recurring: isRecurring,
      recurrence_type: recurrenceType,
      recurrence_days: recurrenceDays,
    };
  });
}




export const Route = createFileRoute("/")({
  component: Index,
});

const MODE_KEY = "inloop:mode";

interface DbTask {
  id: string;
  type: TaskType;
  time: string;
  title: string;
  note: string | null;
  link: string | null;
  image_url: string | null;
  execution_date: string | null;
  is_completed: boolean;
  routine_id: string | null;
  feedback_tag?: string | null;
  comment?: string | null;
  creator_id?: string | null;
  owner_id?: string | null;
  flow_status?: string | null;
}

function pad(n: number) { return String(n).padStart(2, "0"); }
function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function rowToTask(r: DbTask): Task {
  return {
    id: r.id,
    type: r.type,
    time: r.time,
    title: r.title,
    note: r.note ?? undefined,
    link: r.link ?? undefined,
    image_url: r.image_url ?? undefined,
    execution_date: r.execution_date ?? undefined,
    done: r.is_completed,
    feedback_tag: r.feedback_tag ?? null,
    comment: r.comment ?? null,
    creator_id: r.creator_id ?? null,
    owner_id: r.owner_id ?? null,
    flow_status: r.flow_status ?? null,
  };
}

function isoDow(d: Date): number {
  const js = d.getDay(); // 0=Sun..6=Sat
  return js === 0 ? 7 : js;
}
function dateToISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function Index() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rawTaskRows, setRawTaskRows] = useState<DbTask[]>([]);
  const [rawTaskError, setRawTaskError] = useState<string | null>(null);
  const [todayAlarmTasks, setTodayAlarmTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Task[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("planner");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drafts, setDrafts] = useState<DraftTask[]>([]);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [thankShow, setThankShow] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [aiInputsRemaining, setAiInputsRemaining] = useState(3);
  const [aiLoading, setAiLoading] = useState(false);
  const [voiceAlarmOn, setVoiceAlarmOn] = useState(true);
  const today = todayISO();
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const isFamily = mode === "family";
  const isToday = selectedDate === today;

  // 高保真模拟登录守卫：未登录跳转到 /login
  useEffect(() => {
    const uid = getMockUserId();
    if (!uid) {
      navigate({ to: "/login", replace: true });
      return;
    }
    setUserId(uid);
  }, [navigate]);


  // Hydrate mode + voice toggle from localStorage (post-mount to avoid SSR mismatch)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MODE_KEY);
      if (saved === "planner" || saved === "family") setMode(saved);
      const v = localStorage.getItem(VOICE_KEY);
      if (v === "off") setVoiceAlarmOn(false);
    } catch {}
  }, []);

  function changeMode(m: Mode) {
    setMode(m);
    try { localStorage.setItem(MODE_KEY, m); } catch {}
  }

  function changeVoiceAlarm(v: boolean) {
    setVoiceAlarmOn(v);
    try { localStorage.setItem(VOICE_KEY, v ? "on" : "off"); } catch {}
  }

  // Alarms only fire for TODAY's real tasks, regardless of which date the user is browsing
  const { activeAlarm, dismiss: dismissAlarm } = useTaskAlarm({
    tasks: todayAlarmTasks,
    voiceEnabled: voiceAlarmOn,
  });


  // Edge-swipe from left to open drawer
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    function onStart(e: TouchEvent) {
      const t = e.touches[0];
      if (t.clientX <= 24) touchStart.current = { x: t.clientX, y: t.clientY };
      else touchStart.current = null;
    }
    function onEnd(e: TouchEvent) {
      const s = touchStart.current;
      if (!s) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - s.x;
      const dy = Math.abs(t.clientY - s.y);
      if (dx > 60 && dy < 50) setDrawerOpen(true);
      touchStart.current = null;
    }
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, []);



  // —— 数据加载：根据 selectedDate + userId 动态聚合「tasks 单次任务」+「routines 周期任务」 ——
  useEffect(() => {
    if (!userId) return;
    const uid: string = userId;
    let cancelled = false;

    async function loadDateView() {

      // 23:00 Melting Log（只在加载今天时执行，避免来回切日期反复清理）
      if (selectedDate === today) {
        await supabase
          .from("tasks")
          .delete()
          .eq("owner_id", uid)
          .in("type", ["temporary", "routine"])
          .lt("execution_date", today);
        const meltHour = new Date().getHours();
        if (meltHour >= 23) {
          await supabase
            .from("tasks")
            .delete()
            .eq("owner_id", uid)
            .in("type", ["temporary", "routine"])
            .eq("execution_date", today)
            .eq("is_completed", false);
        }
      }

      const dateObj = isoToDate(selectedDate);
      const targetDow = isoDow(dateObj);

      // Debug: 完全不按日期 / owner / flow_status 过滤，直接读取 tasks 原始数组
      const { data: allTaskRows, error: allTaskError } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });
      console.log("[Dashboard][Debug] Current Mock User ID =", uid);
      console.log("[Dashboard][Debug] Total Tasks Fetched =", allTaskRows?.length ?? 0);
      console.log("[Dashboard][Debug] Raw Tasks Array（未过滤）=", allTaskRows, "error =", allTaskError);
      if (!cancelled) {
        setRawTaskRows((allTaskRows ?? []) as DbTask[]);
        setRawTaskError(allTaskError ? allTaskError.message : null);
      }

      // 动作 A：tasks 表中日期严格等于 selectedDate 的所有任务（只看已确认）
      console.log("[Dashboard] 当前看板认定的用户ID =", uid, "| selectedDate =", selectedDate);
      const { data: dayTaskRows } = await supabase
        .from("tasks")
        .select("*")
        .eq("owner_id", uid)
        .eq("flow_status", "accepted")
        .in("type", ["temporary", "routine", "milestone"])
        .eq("execution_date", selectedDate);
      console.log("[Dashboard] 从数据库捞出的原始 tasks 行 =", dayTaskRows);

      // 动作 B：routines 表全量周期任务，前端按 recurrence_days 过滤
      const { data: routineRows } = await supabase
        .from("routines")
        .select("id, time, title, note, recurrence_days")
        .eq("user_id", uid)
        .eq("active", true);

      const matchingRoutines = (routineRows ?? []).filter((r) => {
        const days = (r as { recurrence_days?: number[] | null }).recurrence_days;
        if (!Array.isArray(days) || days.length === 0) return true;
        return days.includes(targetDow);
      });

      // 如果是今天：保证常规任务已被持久化为今天的 tasks 行（便于勾选 ✓）
      if (selectedDate === today && matchingRoutines.length > 0) {
        const upsertRows = matchingRoutines.map((r) => ({
          type: "routine" as const,
          time: r.time,
          title: r.title,
          note: r.note,
          execution_date: today,
          routine_id: r.id,
          user_id: uid,
          owner_id: uid,
          creator_id: uid,
          flow_status: "accepted" as const,
        }));
        await supabase
          .from("tasks")
          .upsert(upsertRows, { onConflict: "routine_id,execution_date", ignoreDuplicates: true });

        // 重新拉一次以拿到新 upsert 的 id
        const { data: refreshed } = await supabase
          .from("tasks")
          .select("*")
          .eq("owner_id", uid)
          .eq("flow_status", "accepted")
          .in("type", ["temporary", "routine", "milestone"])
          .eq("execution_date", today);
        if (cancelled) return;
        const merged = (refreshed ?? []).map(rowToTask);
        merged.sort((a, b) => a.time.localeCompare(b.time));
        setTasks(merged);
        setTodayAlarmTasks(merged);
      } else {
        const persistedRoutineIds = new Set(
          (dayTaskRows ?? [])
            .filter((r) => r.type === "routine" && r.routine_id)
            .map((r) => r.routine_id as string),
        );
        const virtualRoutineTasks: Task[] = matchingRoutines
          .filter((r) => !persistedRoutineIds.has(r.id))
          .map((r) => ({
            id: `vr-${r.id}-${selectedDate}`,
            type: "routine" as const,
            time: r.time,
            title: r.title,
            note: r.note ?? undefined,
            execution_date: selectedDate,
            done: false,
          }));

        const merged: Task[] = [
          ...(dayTaskRows ?? []).map(rowToTask),
          ...virtualRoutineTasks,
        ];
        merged.sort((a, b) => a.time.localeCompare(b.time));
        if (cancelled) return;
        setTasks(merged);

        const { data: todayRows } = await supabase
          .from("tasks")
          .select("*")
          .eq("owner_id", uid)
          .eq("flow_status", "accepted")
          .in("type", ["temporary", "routine"])
          .eq("execution_date", today);
        if (cancelled) return;
        setTodayAlarmTasks((todayRows ?? []).map(rowToTask));
      }

      // Upcoming milestones (today and future) — independent of selectedDate
      const { data: msRows } = await supabase
        .from("tasks")
        .select("*")
        .eq("owner_id", uid)
        .eq("flow_status", "accepted")
        .eq("type", "milestone")
        .gte("execution_date", today)
        .order("execution_date", { ascending: true });
      if (cancelled) return;
      setMilestones((msRows ?? []).map(rowToTask));

      // —— 新要务待确认气泡：所有 owner=我 且 flow_status=pending 的协同任务 ——
      const { data: pendingRows } = await supabase
        .from("tasks")
        .select("*")
        .eq("owner_id", uid)
        .eq("flow_status", "pending")
        .order("execution_date", { ascending: true })
        .order("time", { ascending: true });
      if (cancelled) return;
      setPendingTasks((pendingRows ?? []).map(rowToTask));
    }

    loadDateView();



    // Realtime — only mutate state for rows that match the date the user is currently viewing
    const channel = supabase
      .channel("tasks-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload) => {
          const newRow = payload.new as DbTask | null;
          const oldRow = payload.old as DbTask | null;

          if (payload.eventType === "DELETE" && oldRow) {
            setTasks((ts) => ts.filter((t) => t.id !== oldRow.id));
            setTodayAlarmTasks((ts) => ts.filter((t) => t.id !== oldRow.id));
            setMilestones((ms) => ms.filter((t) => t.id !== oldRow.id));
            setPendingTasks((ps) => ps.filter((t) => t.id !== oldRow.id));
            return;
          }
          if (!newRow) return;
          // 只关心 owner=当前用户 的行
          if (newRow.owner_id !== uid) return;
          const t = rowToTask(newRow);
          const isAccepted = newRow.flow_status === "accepted";
          const isPending = newRow.flow_status === "pending";

          // —— Pending Inbox 同步 ——
          setPendingTasks((ps) => {
            const without = ps.filter((x) => x.id !== t.id);
            if (isPending) {
              return [...without, t].sort(
                (a, b) =>
                  (a.execution_date ?? "").localeCompare(b.execution_date ?? "") ||
                  a.time.localeCompare(b.time),
              );
            }
            return without;
          });

          if (newRow.type === "milestone") {
            setMilestones((ms) => {
              const next = ms.filter((m) => m.id !== t.id);
              if (isAccepted && newRow.execution_date && newRow.execution_date >= today) {
                return [...next, t].sort((a, b) =>
                  (a.execution_date ?? "").localeCompare(b.execution_date ?? ""),
                );
              }
              return next;
            });
          }
          {
            const belongsToView =
              isAccepted &&
              (newRow.execution_date === selectedDate ||
                (!newRow.execution_date && selectedDate === today));
            setTasks((ts) => {
              const filtered = ts.filter((x) => x.id !== t.id);
              if (!belongsToView) return filtered;
              const next = [...filtered, t];
              next.sort((a, b) => a.time.localeCompare(b.time));
              return next;
            });
            if (isAccepted && newRow.execution_date === today && newRow.type !== "milestone") {
              setTodayAlarmTasks((ts) => {
                const filtered = ts.filter((x) => x.id !== t.id);
                return [...filtered, t];
              });
            } else if (!isAccepted) {
              setTodayAlarmTasks((ts) => ts.filter((x) => x.id !== t.id));
            }
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [selectedDate, today, userId, reloadTick]);

  const sorted = useMemo(
    () => [...tasks].sort((a, b) => a.time.localeCompare(b.time)),
    [tasks],
  );

  const routineCount = useMemo(
    () => tasks.filter((t) => t.type === "routine").length,
    [tasks],
  );



  const completed = tasks.filter((t) => t.done).length;

  // (compact header — removed verbose today label)


  async function toggle(id: string) {
    const target = tasks.find((t) => t.id === id);
    if (!target) return;
    const nextDone = !target.done;
    // optimistic
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: nextDone } : t)));
    if (isFamily && nextDone) {
      setThankShow(false);
      requestAnimationFrame(() => setThankShow(true));
    }
    // 虚拟（未来日期未持久化的）routine 行不写库
    if (id.startsWith("vr-")) return;
    await supabase.from("tasks").update({ is_completed: nextDone }).eq("id", id);
  }

  async function handleDelete(id: string) {
    // 🚀 乐观更新：立刻从所有本地列表移除，无需等后端
    setTasks((ts) => ts.filter((t) => t.id !== id));
    setTodayAlarmTasks((ts) => ts.filter((t) => t.id !== id));
    setMilestones((ms) => ms.filter((m) => m.id !== id));
    setPendingTasks((ps) => ps.filter((p) => p.id !== id));
    if (id.startsWith("vr-")) {
      const routineId = id.replace(/^vr-/, "").split("-")[0];
      if (routineId) {
        await supabase.from("routines").delete().eq("id", routineId);
      }
      return;
    }
    await supabase.from("tasks").delete().eq("id", id);
  }


  async function add(payload: {
    time: string;
    title: string;
    note?: string;
    date: Date;
    recurrence: "none" | "daily" | "weekly";
    image_url?: string;
    owner_ids: string[];
  }) {
    const { time, title, note, date, recurrence, image_url, owner_ids } = payload;
    const noteVal = note && note.trim() ? note.trim() : null;
    const creatorId = userId ?? MOCK_USERS.me.id;
    // 🔑 归一化：mock "me" 槽位 → 真实登录 uid，保证写入与看板过滤完全对齐
    const normalize = (id: string) => (id === MOCK_USERS.me.id ? creatorId : id);
    const targets = (owner_ids.length > 0 ? owner_ids : [creatorId]).map(normalize);
    const pad2 = (n: number) => String(n).padStart(2, "0");
    const iso = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
    const isFuture = iso > today;

    if (recurrence === "daily") {
      // 周期任务：为每个 owner 各创建一条 routine
      for (const ownerId of targets) {
        const flow = ownerId === creatorId ? "accepted" : "pending";
        const { data: routine } = await supabase
          .from("routines")
          .insert({
            time,
            title,
            note: noteVal,
            active: true,
            user_id: ownerId,
            owner_id: ownerId,
            creator_id: creatorId,
            flow_status: flow,
          })
          .select("id")
          .single();
        if (routine && !isFuture) {
          await supabase.from("tasks").upsert(
            [{
              type: "routine" as const,
              time,
              title,
              note: noteVal,
              image_url: image_url ?? null,
              execution_date: today,
              routine_id: routine.id,
              user_id: ownerId,
              owner_id: ownerId,
              creator_id: creatorId,
              flow_status: flow,
            }],
            { onConflict: "routine_id,execution_date", ignoreDuplicates: true },
          );
        }
      }
      setReloadTick((n) => n + 1);
      return;
    }

    const rows = targets.map((ownerId) => ({
      type: (recurrence === "weekly" || isFuture ? "milestone" : "temporary") as
        | "milestone"
        | "temporary",
      time,
      title,
      note: noteVal,
      image_url: image_url ?? null,
      execution_date: iso,
      user_id: ownerId,
      owner_id: ownerId,
      creator_id: creatorId,
      flow_status: ownerId === creatorId ? "accepted" : "pending",
    }));
    await supabase.from("tasks").insert(rows);
    setReloadTick((n) => n + 1);
  }



  async function handleSync(instruction: string, attachmentUrl: string, ownerIds: string[]) {
    if (!isPro && aiInputsRemaining <= 0) {
      setPaywallOpen(true);
      return;
    }
    setDrafts([]);
    setVerifyOpen(false);
    setAiLoading(true);
    try {
      let parsed: DraftTask[];
      try {
        // 图片附件不再当作链接喂给 AI，仅在发布时随任务一起存入 image_url
        parsed = await callDeepSeek(instruction, "");
      } catch (err: unknown) {
        console.error("DeepSeek API 报错原因:", err);
        setDrafts([]);
        setVerifyOpen(true);
        const msg =
          err instanceof Error ? `${err.name}: ${err.message}` : String(err);
        alert(
          `🤖 DeepSeek 真 AI 调用失败：\n\n${msg}\n\n请检查：\n1. DEEPSEEK_API_KEY 是否在 Lovable Cloud Secrets 中正确配置\n2. 网络/CORS 是否被拦截\n3. 控制台查看完整堆栈`,
        );
        return;
      }
      if (parsed.length === 0) {
        setDrafts([]);
        setVerifyOpen(true);
        alert("DeepSeek 返回了空数组，没识别出有效日程，换种说法再试一次～");
        return;
      }
      // 将协同目标 + 上传截图 URL 附加到每条草稿
      const stamped = parsed.map((d) => ({
        ...d,
        image_url: attachmentUrl || d.image_url,
        owner_ids: ownerIds.length > 0 ? ownerIds : [MOCK_USERS.me.id],
      }));
      setDrafts(stamped);
      setVerifyOpen(true);
      if (!isPro) setAiInputsRemaining((n) => Math.max(0, n - 1));
    } finally {
      setAiLoading(false);
    }
  }


  async function publishDrafts(finalDrafts: DraftTask[]) {
    const source = finalDrafts ?? drafts;
    const creatorId = userId ?? MOCK_USERS.me.id;
    // 🔑 归一化：mock "me" 槽位 → 真实登录 uid
    const normalize = (id: string) => (id === MOCK_USERS.me.id ? creatorId : id);
    if (source.length > 0) {
      const recurringDrafts = source.filter((d) => d.is_recurring);
      const oneOffDrafts = source.filter((d) => !d.is_recurring);

      // —— ① 单次任务：按协同目标"影子复制"成多条独立行 ——
      if (oneOffDrafts.length > 0) {
        const rows = oneOffDrafts.flatMap((d) => {
          const targets =
            (d.owner_ids && d.owner_ids.length > 0 ? d.owner_ids : [creatorId]).map(normalize);
          return targets.map((ownerId) => ({
            type: d.type,
            time: d.time,
            title: d.title,
            note: d.note,
            link: d.link,
            image_url: d.image_url ?? null,
            execution_date: d.execution_date ?? today,
            user_id: ownerId,
            owner_id: ownerId,
            creator_id: creatorId,
            flow_status: ownerId === creatorId ? "accepted" : "pending",
          }));
        });
        await supabase.from("tasks").insert(rows);
      }

      // —— ② 周期任务：每个 owner 一条 routine + 命中今日则注入 tasks ——
      if (recurringDrafts.length > 0) {
        const routineRows = recurringDrafts.flatMap((d) => {
          const targets =
            (d.owner_ids && d.owner_ids.length > 0 ? d.owner_ids : [creatorId]).map(normalize);
          return targets.map((ownerId) => ({
            time: d.time,
            title: d.title,
            note: d.note ?? null,
            active: true,
            recurrence_type: d.recurrence_type ?? "daily",
            recurrence_days:
              d.recurrence_days && d.recurrence_days.length > 0
                ? d.recurrence_days
                : [1, 2, 3, 4, 5, 6, 7],
            user_id: ownerId,
            owner_id: ownerId,
            creator_id: creatorId,
            flow_status: ownerId === creatorId ? "accepted" : "pending",
          }));
        });
        const { data: insertedRoutines } = await supabase
          .from("routines")
          .insert(routineRows)
          .select("id, time, title, note, recurrence_days, owner_id, creator_id, flow_status");

        const jsDay = new Date().getDay();
        const todayIsoDow = jsDay === 0 ? 7 : jsDay;
        const todaysInjections =
          (insertedRoutines ?? [])
            .filter((r) => {
              const days = (r as { recurrence_days?: number[] | null }).recurrence_days;
              return !Array.isArray(days) || days.length === 0 || days.includes(todayIsoDow);
            })
            .map((r) => {
              const rr = r as {
                id: string;
                time: string;
                title: string;
                note: string | null;
                owner_id: string | null;
                creator_id: string | null;
                flow_status: string | null;
              };
              const ownerId = rr.owner_id ?? creatorId;
              return {
                type: "routine" as const,
                time: rr.time,
                title: rr.title,
                note: rr.note,
                execution_date: today,
                routine_id: rr.id,
                user_id: ownerId,
                owner_id: ownerId,
                creator_id: rr.creator_id ?? creatorId,
                flow_status: rr.flow_status ?? "accepted",
              };
            });
        if (todaysInjections.length > 0) {
          await supabase
            .from("tasks")
            .upsert(todaysInjections, {
              onConflict: "routine_id,execution_date",
              ignoreDuplicates: true,
            });
        }
      }
    }

    setVerifyOpen(false);
    setDrafts([]);
    setReloadTick((n) => n + 1);
  }


  return (
    <main className="relative mx-auto min-h-screen w-full max-w-md md:max-w-2xl bg-background md:shadow-[0_0_60px_-20px_rgba(34,34,34,0.12)]">
      <header className="px-6 pb-2 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="打开菜单"
              className="-ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-foreground/80 transition-all hover:bg-foreground/5 active:scale-95"
            >
              <Menu className="h-[15px] w-[15px] stroke-[1.75]" />
            </button>
            <span className="rounded-full border border-foreground/15 px-2 py-0.5 text-[9.5px] font-medium tracking-[0.14em] text-foreground/65">
              {isFamily ? "看板模式 · GLANCEABLE" : `控制台${isPro ? " · Pro" : ""}`}
            </span>

          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric" })}
            </span>
            <span className="text-[10.5px] tracking-[0.06em] text-muted-foreground">
              <span className="font-medium text-primary">{completed}</span>
              <span className="text-foreground/40">/{tasks.length}</span>
              <span className="ml-1">已完成</span>
            </span>
          </div>
        </div>

        <div className="mt-2">
          <h1 className="text-[20px] font-semibold leading-none tracking-tight text-foreground">
            InLoop
          </h1>
          <p className="mt-1 text-[9px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            INLOOP — HIGH-IQ EXECUTIVE AGENDA COLLABORATION AGENT
          </p>
        </div>

        {/* 当前操作员挂牌 · 一键切换账户 */}
        {(() => {
          const me = getMockUserById(userId);
          const displayLabel = me?.label ?? "当前用户";
          return (
            <div className="mt-3 flex items-center justify-between gap-2 rounded-full border border-foreground/10 bg-card/70 px-2.5 py-1 shadow-[0_1px_2px_rgba(34,34,34,0.03)]">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold leading-none",
                    me?.avatarColor ?? "bg-foreground/10 text-foreground/70",
                  )}
                >
                  {displayLabel.slice(-1)}
                </span>
                <span className="truncate text-[10.5px] tracking-wide text-foreground/65">
                  当前操作员：<span className="font-medium text-foreground">{displayLabel}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  logoutMock();
                  navigate({ to: "/login", replace: true });
                }}
                className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-foreground/55 transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
                aria-label="切换账户"
              >
                <LogOut className="h-3 w-3" />
                切换账户
              </button>
            </div>
          );
        })()}
      </header>

      {!isFamily && (
        <section className="space-y-2.5 px-6 pb-1">
          <AIComposer onSync={handleSync} remaining={isPro ? null : aiInputsRemaining} loading={aiLoading} currentUserId={userId} />
        </section>
      )}

      <PendingInbox
        tasks={pendingTasks.map<PendingTask>((t) => ({
          id: t.id,
          time: t.time,
          title: t.title,
          note: t.note ?? null,
          image_url: t.image_url ?? null,
          execution_date: t.execution_date ?? null,
          creator_id: t.creator_id ?? null,
          owner_id: t.owner_id ?? null,
        }))}
        onChanged={() => setReloadTick((n) => n + 1)}
        onOptimisticAccept={(pt) => {
          setPendingTasks((ps) => ps.filter((x) => x.id !== pt.id));
          const belongsToView = (pt.execution_date ?? today) === selectedDate;
          if (belongsToView) {
            const newTask: Task = {
              id: pt.id,
              type: "temporary",
              time: pt.time,
              title: pt.title,
              note: pt.note ?? undefined,
              image_url: pt.image_url ?? undefined,
              execution_date: pt.execution_date ?? undefined,
              done: false,
              feedback_tag: "received",
              creator_id: pt.creator_id ?? null,
              owner_id: pt.owner_id ?? null,
              flow_status: "accepted",
            };
            setTasks((ts) => {
              const without = ts.filter((x) => x.id !== pt.id);
              const next = [...without, newTask];
              next.sort((a, b) => a.time.localeCompare(b.time));
              return next;
            });
            if ((pt.execution_date ?? today) === today) {
              setTodayAlarmTasks((ts) => {
                const without = ts.filter((x) => x.id !== pt.id);
                return [...without, newTask];
              });
            }
          }
        }}
        onOptimisticConflict={(pt) => {
          // 冲突仅本地高亮标签即可，不需移出气泡
          setPendingTasks((ps) => ps.map((x) => (x.id === pt.id ? { ...x } : x)));
        }}
      />




      <section className="px-6 pb-40 pt-3">
        <div className="flex items-center gap-3 pb-1">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "group inline-flex items-center gap-1.5 rounded-md px-1 -mx-1 transition-colors hover:bg-foreground/[0.04]",
                  isFamily
                    ? "text-[14px] font-medium tracking-[0.14em] text-foreground/80"
                    : "text-[10.5px] font-medium tracking-[0.12em] text-foreground/80",
                )}
              >
                <span>
                  {isToday ? "今日核心要务" : `${selectedDate.slice(5).replace("-", "/")} · 行程`}
                </span>
                <CalendarIcon
                  className={cn(
                    "shrink-0 text-foreground/40 transition-colors group-hover:text-foreground/70",
                    isFamily ? "h-3.5 w-3.5" : "h-3 w-3",
                  )}
                />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              sideOffset={6}
              className="w-auto rounded-xl border-foreground/10 bg-card p-0 shadow-[0_8px_30px_-12px_rgba(34,34,34,0.18)]"
            >
              <Calendar
                mode="single"
                selected={isoToDate(selectedDate)}
                onSelect={(d) => {
                  if (!d) return;
                  setSelectedDate(dateToISO(d));
                  setCalendarOpen(false);
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <span className="h-px flex-1 bg-foreground/10" />
        </div>
        <p className="pb-3 text-[10.5px] font-light leading-snug text-foreground/40">
          {tasks.length === 0
            ? "暂无任何安排"
            : `共有 ${tasks.length} 项安排（含 ${routineCount} 项常驻常规）`}
        </p>


        <div>
          {sorted.map((t) => (
            <TaskItem key={t.id} task={t} onToggle={toggle} mode={mode} onDelete={handleDelete} />
          ))}
        </div>
      </section>


      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-md md:max-w-2xl justify-center pb-8">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Add task"
          className={
            isFamily
              ? "pointer-events-auto inline-flex items-center justify-center rounded-full bg-foreground/80 p-2.5 text-background shadow-[0_6px_18px_-8px_rgba(34,34,34,0.4)] opacity-70 transition-all hover:opacity-100 active:scale-[0.98]"
              : "pointer-events-auto inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3.5 text-[13px] font-medium tracking-wide text-background shadow-[0_10px_30px_-10px_rgba(34,34,34,0.45)] transition-all hover:bg-foreground/90 active:scale-[0.98]"
          }
        >
          <Plus className={isFamily ? "h-3.5 w-3.5 stroke-[2.25]" : "h-4 w-4 stroke-[2.25]"} />
          {!isFamily && "新建任务"}
        </button>
      </div>

      <AddTaskSheet open={open} onOpenChange={setOpen} onAdd={add} currentUserId={userId} />
      <VerificationModal
        open={verifyOpen}
        drafts={drafts}
        onCancel={() => setVerifyOpen(false)}
        onConfirm={publishDrafts}
        currentUserId={userId}
      />
      <ThankYouToast show={thankShow} onDone={() => setThankShow(false)} />
      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} />
      <SideDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={mode}
        onModeChange={changeMode}
        isPro={isPro}
        onTogglePro={setIsPro}
        onRequestPaywall={() => setPaywallOpen(true)}
        voiceAlarmOn={voiceAlarmOn}
        onVoiceAlarmChange={changeVoiceAlarm}
      />
      <WakeAlarmOverlay task={activeAlarm} onDismiss={dismissAlarm} />
      {/* Edge-swipe hint strip (visual cue, also clickable) */}
      <button
        type="button"
        aria-label="从左边缘滑动打开菜单"
        onClick={() => setDrawerOpen(true)}
        className="fixed left-0 top-1/2 z-10 h-16 w-1 -translate-y-1/2 rounded-r-full bg-foreground/10 transition-all hover:w-1.5 hover:bg-foreground/25"
      />
    </main>
  );
}
