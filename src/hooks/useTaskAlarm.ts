import { useEffect, useRef, useState } from "react";
import type { Task } from "@/components/inloop/TaskItem";

interface Options {
  tasks: Task[];
  voiceEnabled: boolean;
  enabled?: boolean;
}

// Parse HH:MM into today's Date
function timeToToday(hhmm: string): Date | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const d = new Date();
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d;
}

function speak(task: Task, voiceEnabled: boolean) {
  if (!voiceEnabled) return;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const text = `现在是 ${task.time}，温馨提醒：${task.title}。${task.note || ""}`;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-CN";
    u.rate = 0.7;
    u.pitch = 1;
    u.volume = 0.85;
    window.speechSynthesis.speak(u);
  } catch (e) {
    console.warn("[TTS] speak failed", e);
  }
}

function vibrate() {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([120, 80, 120]);
    }

  } catch {
    // ignore
  }
}

export function useTaskAlarm({ tasks, voiceEnabled, enabled = true }: Options) {
  const [activeAlarm, setActiveAlarm] = useState<Task | null>(null);
  // Tasks already alerted this session
  const alertedRef = useRef<Set<string>>(new Set());
  // Track previously seen task IDs to detect newly inserted tasks
  const knownIdsRef = useRef<Set<string>>(new Set());
  const firstRunRef = useRef(true);

  // Detect newly inserted tasks for "remote urgent" path
  useEffect(() => {
    if (!enabled) return;
    const currentIds = new Set(tasks.map((t) => t.id));
    if (firstRunRef.current) {
      knownIdsRef.current = currentIds;
      firstRunRef.current = false;
      return;
    }
    const now = Date.now();
    for (const t of tasks) {
      if (knownIdsRef.current.has(t.id)) continue;
      if (t.done) continue;
      if (alertedRef.current.has(t.id)) continue;
      const at = timeToToday(t.time);
      if (!at) continue;
      const diff = at.getTime() - now;
      // Urgent: brand-new remote task whose time is within ±5 min
      if (diff >= -60_000 && diff <= 5 * 60_000) {
        alertedRef.current.add(t.id);
        setActiveAlarm((cur) => cur ?? t);
        speak(t, voiceEnabled);
        vibrate();
        break;
      }
    }
    knownIdsRef.current = currentIds;
  }, [tasks, enabled, voiceEnabled]);

  // Polling: every 30s look for any due tasks
  useEffect(() => {
    if (!enabled) return;
    function tick() {
      const now = Date.now();
      for (const t of tasks) {
        if (t.done) continue;
        if (alertedRef.current.has(t.id)) continue;
        const at = timeToToday(t.time);
        if (!at) continue;
        const diff = at.getTime() - now;
        // Window: from 60s before to 60s after the scheduled time
        if (diff <= 60_000 && diff >= -60_000) {
          alertedRef.current.add(t.id);
          setActiveAlarm((cur) => cur ?? t);
          speak(t, voiceEnabled);
          vibrate();
          break;
        }
      }
    }
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [tasks, enabled, voiceEnabled]);

  function dismiss() {
    try {
      window.speechSynthesis?.cancel();
    } catch {
      // ignore
    }
    try {
      navigator.vibrate?.(0);
    } catch {
      // ignore
    }
    setActiveAlarm(null);
  }

  return { activeAlarm, dismiss };
}
