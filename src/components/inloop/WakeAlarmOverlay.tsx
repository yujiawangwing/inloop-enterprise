import { useEffect } from "react";
import type { Task } from "./TaskItem";

interface Props {
  task: Task | null;
  onDismiss: () => void;
}

export function WakeAlarmOverlay({ task, onDismiss }: Props) {
  // Lock body scroll while overlay open
  useEffect(() => {
    if (!task) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [task]);

  if (!task) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="任务到点温和提醒，轻触屏幕任意位置即可关闭"
      onClick={onDismiss}
      onTouchStart={onDismiss}
      className="fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center overflow-hidden px-8 py-10 animate-in fade-in duration-300"
      style={{
        backgroundColor: "#FDF6E3",
        animation: "wakeBreath 5s ease-in-out infinite",
      }}
    >
      <style>{`
        @keyframes wakeBreath {
          0%, 100% { background-color: #FDF6E3; }
          50% { background-color: #F7EED1; }
        }
      `}</style>

      <div className="relative z-10 flex flex-col items-center gap-8 text-center select-none">
        <div
          className="text-5xl font-bold leading-none tracking-tight"
          style={{ color: "#7A9B76", fontVariantNumeric: "tabular-nums" }}
        >
          {task.time}
        </div>

        <div className="max-w-[20ch] text-3xl font-medium leading-snug text-neutral-800">
          {task.title}
        </div>

        {task.note && (
          <div className="max-w-[24ch] text-sm font-normal leading-relaxed text-neutral-500">
            {task.note}
          </div>
        )}
      </div>

      <p className="pointer-events-none absolute bottom-10 left-0 right-0 text-center text-[12px] font-light tracking-[0.25em] text-neutral-400">
        轻触屏幕任意位置即可关闭
      </p>
    </div>
  );
}
