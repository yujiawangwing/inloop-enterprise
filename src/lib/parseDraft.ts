export type DraftType = "temporary" | "milestone";
export type RecurrenceType = "daily" | "weekly" | null;

export interface DraftTask {
  type: DraftType;
  time: string; // "HH:MM"
  title: string;
  note?: string;
  link?: string;
  execution_date?: string; // YYYY-MM-DD, only for milestones
  // —— 周期任务字段 ——
  is_recurring?: boolean;
  recurrence_type?: RecurrenceType;
  recurrence_days?: number[] | null; // 1=Mon ... 7=Sun
}

