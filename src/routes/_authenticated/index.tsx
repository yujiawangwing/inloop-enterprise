import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Menu, Calendar as CalendarIcon, LogOut, Users } from "lucide-react";
import { TaskItem, type Task, type TaskType } from "@/components/inloop/TaskItem";
import { AddTaskSheet } from "@/components/inloop/AddTaskSheet";

import { SideDrawer } from "@/components/inloop/SideDrawer";
import { AIComposer } from "@/components/inloop/AIComposer";
import { VerificationModal } from "@/components/inloop/VerificationModal";
import { ThankYouToast } from "@/components/inloop/ThankYouToast";
import { PaywallModal } from "@/components/inloop/PaywallModal";
import { PendingInbox, type PendingTask } from "@/components/inloop/PendingInbox";
import { TeamManager } from "@/components/inloop/TeamManager";
import { NotificationsBell } from "@/components/inloop/NotificationsBell";
import { type DraftTask } from "@/lib/parseDraft";
import { supabase } from "@/integrations/supabase/client";
import { ME_SENTINEL_ID, primeContacts, useContacts } from "@/lib/contacts";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { parseDraftWithDeepSeek, type DeepSeekDraft } from "@/lib/deepseek.functions";
import { tryLocalParse } from "@/lib/localParse";
import { WakeAlarmOverlay } from "@/components/inloop/WakeAlarmOverlay";
import { useTaskAlarm } from "@/hooks/useTaskAlarm";

const VOICE_KEY = "inloop:voiceAlarm";

async function callDeepSeek(instruction: string, pastedLink: string): Promise<DraftTask[]> {
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
      recurrenceType = d.recurrence_type === "weekly" ? "weekly" : "daily";
      const days = Array.isArray(d.recurrence_days)
        ? d.recurrence_days.filter((n) => Number.isInteger(n) && n >= 1 && n <= 7)
        : [];
      recurrenceDays =
        recurrenceType === "daily" || days.length === 0
          ? [1, 2, 3, 4, 5, 6, 7]
          : Array.from(new Set(days)).sort();
    }
    const todayStr = todayISO();
    const rawDate = String(d.date ?? "").trim();
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : todayStr;
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

export const Route = createFileRoute("/_authenticated/")({
  component: Index,
});

// Legacy keys purged on mount to prevent any lingering "big mode" state.
const LEGACY_KEYS = ["inloop:mode", "isBoardMode", "deviceMode"];


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
  const js = d.getDay();
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
  const [displayName, setDisplayName] = useState<string>("当前用户");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [todayAlarmTasks, setTodayAlarmTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Task[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [open, setOpen] = useState(false);
  // Mode removed — always standard console view.
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
  const [teamOpen, setTeamOpen] = useState(false);
  
  const isToday = selectedDate === today;

  // 团队成员（真实 user_connections）
  const { others: teamContacts, all: allContacts, reload: reloadContacts } = useContacts(userId, displayName);

  // —— Supabase Auth · 真实会话守卫（_authenticated 子树已统一兜底，这里仅同步本地状态）——
  useEffect(() => {
    let cancelled = false;

    async function syncUser() {
      const { data, error } = await supabase.auth.getUser();
      if (cancelled) return;
      if (error || !data.user) {
        navigate({ to: "/login", replace: true });
        return;
      }
      setUserId(data.user.id);
      setUserEmail(data.user.email ?? null);
      setUserPhone(data.user.phone ?? null);

      // 拉取 display_name
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", data.user.id)
        .maybeSingle();
      if (cancelled) return;
      const meta = (data.user.user_metadata ?? {}) as { display_name?: string; full_name?: string };
      setDisplayName(
        profile?.display_name ||
          meta.display_name ||
          meta.full_name ||
          (data.user.email ? data.user.email.split("@")[0] : "当前用户"),
      );
    }

    syncUser();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return;
      if (event === "SIGNED_OUT") {
        setUserId(null);
        navigate({ to: "/login", replace: true });
      } else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        syncUser();
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  // 本地存储：清理遗留的“大字版/看板模式”缓存 + 加载语音开关
  useEffect(() => {
    try {
      for (const k of LEGACY_KEYS) localStorage.removeItem(k);
      const v = localStorage.getItem(VOICE_KEY);
      if (v === "off") setVoiceAlarmOn(false);
    } catch {}
  }, []);



  function changeVoiceAlarm(v: boolean) {
    setVoiceAlarmOn(v);
    try { localStorage.setItem(VOICE_KEY, v ? "on" : "off"); } catch {}
  }

  const { activeAlarm, dismiss: dismissAlarm } = useTaskAlarm({
    tasks: todayAlarmTasks,
    voiceEnabled: voiceAlarmOn,
  });

  // Edge-swipe drawer
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

  // —— 数据加载：按 selectedDate + userId 聚合「单次任务 + 周期任务」——
  useEffect(() => {
    if (!userId) return;
    const uid: string = userId;
    let cancelled = false;

    async function loadDateView() {
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

      const { data: dayTaskRows } = await supabase
        .from("tasks")
        .select("*")
        .eq("owner_id", uid)
        .eq("flow_status", "accepted")
        .in("type", ["temporary", "routine", "milestone"])
        .eq("execution_date", selectedDate);

      const { data: routineRows } = await supabase
        .from("routines")
        .select("id, time, title, note, recurrence_days")
        .eq("owner_id", uid)
        .eq("flow_status", "accepted")
        .eq("active", true);

      const matchingRoutines = (routineRows ?? []).filter((r) => {
        const days = (r as { recurrence_days?: number[] | null }).recurrence_days;
        if (!Array.isArray(days) || days.length === 0) return true;
        return days.includes(targetDow);
      });

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

    // Realtime
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
          if (newRow.owner_id !== uid) return;
          const t = rowToTask(newRow);
          const isAccepted = newRow.flow_status === "accepted";
          const isPending = newRow.flow_status === "pending";

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

  // 为看板 / 收件箱中出现的 creator/owner 补齐 profile 名称（可能是不在通讯录里的用户）
  useEffect(() => {
    if (!userId) return;
    const knownIds = new Set<string>([userId, ...teamContacts.map((c) => c.id)]);
    const needed = new Set<string>();
    for (const t of [...tasks, ...pendingTasks, ...milestones]) {
      if (t.creator_id && !knownIds.has(t.creator_id)) needed.add(t.creator_id);
      if (t.owner_id && !knownIds.has(t.owner_id)) needed.add(t.owner_id);
    }
    if (needed.size === 0) return;
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", Array.from(needed))
      .then(({ data }) => {
        if (data && data.length > 0) primeContacts(data);
      });
  }, [tasks, pendingTasks, milestones, teamContacts, userId]);

  const sorted = useMemo(
    () => [...tasks].sort((a, b) => a.time.localeCompare(b.time)),
    [tasks],
  );

  const routineCount = useMemo(
    () => tasks.filter((t) => t.type === "routine").length,
    [tasks],
  );

  const completed = tasks.filter((t) => t.done).length;

  async function toggle(id: string) {
    const target = tasks.find((t) => t.id === id);
    if (!target) return;
    const nextDone = !target.done;
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: nextDone } : t)));
    if (id.startsWith("vr-")) return;
    await supabase.from("tasks").update({ is_completed: nextDone }).eq("id", id);
  }

  async function handleDelete(id: string) {
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
    if (!userId) return;
    const { time, title, note, date, recurrence, image_url, owner_ids } = payload;
    const noteVal = note && note.trim() ? note.trim() : null;
    const creatorId = userId;
    // 归一化：把 me 槽位 sentinel 替换为真实 uid
    const normalize = (id: string) => (id === ME_SENTINEL_ID ? creatorId : id);
    const targets = (owner_ids.length > 0 ? owner_ids : [creatorId]).map(normalize);
    const pad2 = (n: number) => String(n).padStart(2, "0");
    const iso = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
    const isFuture = iso > today;

    if (recurrence === "daily") {
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

    const fastLane = tryLocalParse(instruction);
    if (fastLane && fastLane.length > 0) {
      const stamped = fastLane.map((d) => ({
        ...d,
        image_url: attachmentUrl || d.image_url,
        owner_ids: ownerIds.length > 0 ? ownerIds : [ME_SENTINEL_ID],
      }));
      setDrafts(stamped);
      setVerifyOpen(true);
      return;
    }

    setAiLoading(true);
    try {
      let parsed: DraftTask[];
      try {
        parsed = await callDeepSeek(instruction, "");
      } catch (err: unknown) {
        console.error("DeepSeek API 报错原因:", err);
        setDrafts([]);
        setVerifyOpen(true);
        const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
        alert(
          `🤖 DeepSeek 真 AI 调用失败：\n\n${msg}\n\n请检查：\n1. DEEPSEEK_API_KEY 是否在 Lovable Cloud Secrets 中正确配置\n2. 当前用户登录态是否有效\n3. 控制台查看完整堆栈`,
        );
        return;
      }
      if (parsed.length === 0) {
        setDrafts([]);
        setVerifyOpen(true);
        alert("DeepSeek 返回了空数组，没识别出有效日程，换种说法再试一次～");
        return;
      }
      const stamped = parsed.map((d) => ({
        ...d,
        image_url: attachmentUrl || d.image_url,
        owner_ids: ownerIds.length > 0 ? ownerIds : [ME_SENTINEL_ID],
      }));
      setDrafts(stamped);
      setVerifyOpen(true);
      if (!isPro) setAiInputsRemaining((n) => Math.max(0, n - 1));
    } finally {
      setAiLoading(false);
    }
  }

  async function publishDrafts(finalDrafts: DraftTask[]) {
    if (!userId) return;
    const source = finalDrafts ?? drafts;
    const creatorId = userId;
    const normalize = (id: string) => (id === ME_SENTINEL_ID ? creatorId : id);
    if (source.length > 0) {
      const recurringDrafts = source.filter((d) => d.is_recurring);
      const oneOffDrafts = source.filter((d) => !d.is_recurring);

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

  async function handleSignOut() {
    await supabase.auth.signOut();
    // 跳转由 onAuthStateChange 接管
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
            {isPro && (
              <span className="rounded-full border border-foreground/15 px-2 py-0.5 text-[9.5px] font-medium tracking-[0.14em] text-foreground/65">
                Pro
              </span>
            )}
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
            <NotificationsBell userId={userId} />
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

        {/* 当前操作员挂牌 · 真实 Supabase 用户 */}
        <div className="mt-3 flex items-center justify-between gap-2 rounded-full border border-foreground/10 bg-card/70 px-2.5 py-1 shadow-[0_1px_2px_rgba(34,34,34,0.03)]">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={cn(
                "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-semibold leading-none",
              )}
            >
              {displayName.slice(0, 1).toUpperCase()}
            </span>
            <span className="truncate text-[10.5px] tracking-wide text-foreground/65">
              当前操作员：<span className="font-medium text-foreground">{displayName}</span>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => setTeamOpen(true)}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-foreground/60 transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
              aria-label="团队成员管理"
            >
              <Users className="h-3 w-3" />
              团队{teamContacts.length > 0 && <span className="text-foreground/45">·{teamContacts.length}</span>}
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-foreground/55 transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
              aria-label="退出登录"
            >
              <LogOut className="h-3 w-3" />
              退出
            </button>
          </div>
        </div>
      </header>

      <section className="space-y-2.5 px-6 pb-1">
        <AIComposer
          onSync={handleSync}
          remaining={isPro ? null : aiInputsRemaining}
          loading={aiLoading}
          currentUserId={userId}
          contacts={allContacts}
          onManageTeam={() => setTeamOpen(true)}
        />
      </section>


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
          setPendingTasks((ps) => ps.filter((x) => x.id !== pt.id));
          setTasks((ts) => ts.filter((x) => x.id !== pt.id));
          setTodayAlarmTasks((ts) => ts.filter((x) => x.id !== pt.id));
          setMilestones((ms) => ms.filter((x) => x.id !== pt.id));
        }}
      />

      <section className="px-6 pb-40 pt-3">
        <div className="flex items-center gap-3 pb-1">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="group inline-flex items-center gap-1.5 rounded-md px-1 -mx-1 text-[10.5px] font-medium tracking-[0.12em] text-foreground/80 transition-colors hover:bg-foreground/[0.04]"
              >
                <span>
                  {isToday ? "今日核心要务" : `${selectedDate.slice(5).replace("-", "/")} · 行程`}
                </span>
                <CalendarIcon className="h-3 w-3 shrink-0 text-foreground/40 transition-colors group-hover:text-foreground/70" />
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
            <TaskItem key={t.id} task={t} onToggle={toggle} onDelete={handleDelete} />
          ))}
        </div>
      </section>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-md md:max-w-2xl justify-center pb-8">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Add task"
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3.5 text-[13px] font-medium tracking-wide text-background shadow-[0_10px_30px_-10px_rgba(34,34,34,0.45)] transition-all hover:bg-foreground/90 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4 stroke-[2.25]" />
          新建任务
        </button>
      </div>

      <AddTaskSheet
        open={open}
        onOpenChange={setOpen}
        onAdd={add}
        currentUserId={userId}
        contacts={allContacts}
        onManageTeam={() => setTeamOpen(true)}
      />
      <VerificationModal
        open={verifyOpen}
        drafts={drafts}
        onCancel={() => setVerifyOpen(false)}
        onConfirm={publishDrafts}
        currentUserId={userId}
        contacts={allContacts}
        onManageTeam={() => setTeamOpen(true)}
      />
      <TeamManager
        open={teamOpen}
        onOpenChange={setTeamOpen}
        currentUserId={userId}
        connections={teamContacts}
        onChanged={reloadContacts}
      />
      <ThankYouToast show={thankShow} onDone={() => setThankShow(false)} />
      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} />
      <SideDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        displayName={displayName}
        email={userEmail}
        phone={userPhone}
        teamContacts={teamContacts}
        onOpenTeamManager={() => {
          setDrawerOpen(false);
          setTeamOpen(true);
        }}
        onSignOut={handleSignOut}
      />
      <WakeAlarmOverlay task={activeAlarm} onDismiss={dismissAlarm} />
      <button
        type="button"
        aria-label="从左边缘滑动打开菜单"
        onClick={() => setDrawerOpen(true)}
        className="fixed left-0 top-1/2 z-10 h-16 w-1 -translate-y-1/2 rounded-r-full bg-foreground/10 transition-all hover:w-1.5 hover:bg-foreground/25"
      />
      {/* milestones state kept for future surface — referenced to satisfy strict TS unused-vars */}
      <span className="hidden">{milestones.length}</span>
    </main>
  );
}
