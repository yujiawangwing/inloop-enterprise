import { cn } from "@/lib/utils";

export type Mode = "planner" | "family";

interface Props {
  mode: Mode;
  onChange: (m: Mode) => void;
}

const OPTIONS: { value: Mode; label: string }[] = [
  { value: "planner", label: "管理员模式" },
  { value: "family", label: "全家看板" },
];

export function ModeSwitch({ mode, onChange }: Props) {
  return (
    <div className="inline-flex items-center rounded-full border border-foreground/10 bg-card p-1 shadow-[0_1px_2px_rgba(34,34,34,0.04)]">
      {OPTIONS.map((opt) => {
        const active = mode === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={cn(
              "relative min-w-[96px] rounded-full px-5 py-1.5 text-[12px] font-medium tracking-[0.08em] transition-all",
              active
                ? "bg-foreground text-background shadow-sm"
                : "text-foreground/55 hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
