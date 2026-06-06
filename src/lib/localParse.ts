import type { DraftTask } from "./parseDraft";

/**
 * 智能分流网关 · 本地快车道解析器
 *
 * 设计目标：在不调用大模型的前提下，对极其简单、明确的单条日程指令做秒级解析。
 * 失败时返回 null，调用方应回落到 AI 慢车道。
 */

// 复杂多任务连词 —— 命中即拒绝走快车道
const COMPLEX_CONNECTORS = /(还要|顺便|记得|并且|另外|然后|接着|再(去|要)|以及|同时|和.*?(开|见|参加))/;

// 长度阈值
const FAST_LANE_MAX_CHARS = 15;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDaysISO(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface DateMatch {
  date: string;
  matched: string; // 原文中要剥离的片段
  offset: number;  // 0=今天 1=明天 2=后天
}

function extractDate(text: string): DateMatch | null {
  if (/后天/.test(text)) return { date: addDaysISO(2), matched: "后天", offset: 2 };
  if (/明天|明日/.test(text)) {
    const m = text.match(/明天|明日/)![0];
    return { date: addDaysISO(1), matched: m, offset: 1 };
  }
  if (/今天|今日/.test(text)) {
    const m = text.match(/今天|今日/)![0];
    return { date: todayISO(), matched: m, offset: 0 };
  }
  return null;
}

interface TimeMatch {
  time: string; // HH:MM
  matched: string;
}

function extractTime(text: string): TimeMatch | null {
  // 1) HH:MM / H:MM
  const colon = text.match(/(\d{1,2}):(\d{2})/);
  if (colon) {
    const h = Number(colon[1]);
    const m = Number(colon[2]);
    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      return { time: `${pad(h)}:${pad(m)}`, matched: colon[0] };
    }
  }

  // 2) 中文：[上午|下午|晚上|凌晨|中午]?(X)点(半|X分|X)?
  const cn = text.match(
    /(上午|下午|晚上|傍晚|凌晨|中午|早上|早晨)?\s*(\d{1,2})\s*点\s*(半|(\d{1,2})\s*分?)?/,
  );
  if (cn) {
    const period = cn[1];
    let h = Number(cn[2]);
    let m = 0;
    if (cn[3]) {
      if (cn[3] === "半") m = 30;
      else if (cn[4]) m = Number(cn[4]);
    }
    if (period === "下午" || period === "晚上" || period === "傍晚") {
      if (h < 12) h += 12;
    } else if (period === "中午") {
      if (h < 12) h += 12;
    } else if (period === "凌晨") {
      if (h === 12) h = 0;
    }
    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      return { time: `${pad(h)}:${pad(m)}`, matched: cn[0] };
    }
  }

  return null;
}

/**
 * 尝试本地极简解析；命中返回单条 DraftTask 数组，否则返回 null。
 */
export function tryLocalParse(instruction: string): DraftTask[] | null {
  const text = instruction.trim();
  if (!text) return null;
  if (text.length >= FAST_LANE_MAX_CHARS) return null;
  if (COMPLEX_CONNECTORS.test(text)) return null;

  const t = extractTime(text);
  if (!t) return null;

  const d = extractDate(text);
  const dateISO = d?.date ?? todayISO();

  // 剥离日期 / 时间片段后剩余文本即标题
  let title = text;
  if (d) title = title.replace(d.matched, "");
  title = title.replace(t.matched, "");
  title = title.replace(/[，,。\.\s]+/g, " ").trim();

  if (!title) return null;
  if (title.length < 2) return null; // 标题太短认为不可信，回落到 AI

  const today = todayISO();
  const isFuture = dateISO > today;

  return [
    {
      type: isFuture ? "milestone" : "temporary",
      time: t.time,
      title: title.slice(0, 80),
      execution_date: dateISO,
      is_recurring: false,
      recurrence_type: null,
      recurrence_days: null,
    },
  ];
}
