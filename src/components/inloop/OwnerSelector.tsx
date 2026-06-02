import { useState } from "react";
import { Users, Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { MOCK_USERS, MOCK_USER_LIST, getMockUserById, isFixedMockId } from "@/lib/mockUsers";

interface Props {
  value: string[];                       // 当前勾选的 owner_id 列表
  onChange: (next: string[]) => void;
  currentUserId?: string | null;         // 用于高亮"我本人"
  size?: "sm" | "md";
  align?: "start" | "end";
}

/**
 * 协同目标选择器 (To:)
 */
export function OwnerSelector({
  value,
  onChange,
  currentUserId,
  size = "md",
  align = "start",
}: Props) {
  const [open, setOpen] = useState(false);

  // 当登录身份命中固定 mock 用户（开发者测试通道）→ 直接以 3 个固定 ID 渲染列表，避免 id 重复
  // 否则（手机号/微信随机 UUID 登录）→ 把"我本人"槽位映射到真实 uid
  const fixed = isFixedMockId(currentUserId);
  const meId = fixed ? (currentUserId as string) : (currentUserId ?? MOCK_USERS.me.id);
  const userList = fixed
    ? MOCK_USER_LIST
    : MOCK_USER_LIST.map((u) =>
        u.id === MOCK_USERS.me.id ? { ...u, id: meId } : u,
      );
  const isMeId = (id: string) => id === meId || (!fixed && id === MOCK_USERS.me.id);

  function toggle(id: string) {
    if (value.includes(id)) {
      if (value.length === 1) return; // 至少留 1 个
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  }

  const selectedUsers = value
    .map((id) => {
      if (isMeId(id)) {
        const meUser = fixed ? getMockUserById(meId) : MOCK_USERS.me;
        return meUser ? { ...meUser, id: meId } : null;
      }
      return getMockUserById(id);
    })
    .filter((u): u is NonNullable<ReturnType<typeof getMockUserById>> => Boolean(u));

  const compact = size === "sm";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "group inline-flex max-w-full items-center gap-1.5 rounded-full border bg-card transition-all",
            "border-foreground/15 hover:border-primary/40 hover:bg-primary/5",
            compact ? "px-2 py-1 text-[10.5px]" : "px-2.5 py-1.5 text-[11px]",
          )}
          aria-label="选择协同目标"
        >
          <Users className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5", "shrink-0 text-foreground/55")} />
          <span className="font-medium uppercase tracking-[0.14em] text-foreground/50">To:</span>
          <span className="flex min-w-0 flex-wrap items-center gap-1">
            {selectedUsers.map((u) => {
              const isMe = isMeId(u.id);
              return (
                <span
                  key={u.id}
                  className={cn(
                    "inline-flex items-center rounded-full px-1.5 py-[1px] text-[10px] font-medium leading-none",
                    u.avatarColor,
                    isMe && "ring-1 ring-primary/30",
                  )}
                >
                  {isMe ? `${u.label} · 我` : u.label}
                </span>
              );
            })}
          </span>
          <ChevronDown className={cn(compact ? "h-2.5 w-2.5" : "h-3 w-3", "shrink-0 text-foreground/35 transition-transform group-data-[state=open]:rotate-180")} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={6}
        className="w-56 rounded-xl border-foreground/10 bg-card p-1.5 shadow-[0_8px_30px_-12px_rgba(34,34,34,0.18)]"
      >
        <div className="px-2 py-1.5 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-foreground/45">
          协同目标 · 可多选
        </div>
        {userList.map((u) => {
          const checked = value.includes(u.id) || (isMeId(u.id) && value.some(isMeId));
          const isMe = isMeId(u.id);
          return (
            <button
              key={u.id}
              type="button"
              onClick={() => toggle(u.id)}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left transition-colors",
                checked ? "bg-primary/8" : "hover:bg-foreground/[0.04]",
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold leading-none",
                    u.avatarColor,
                  )}
                >
                  {u.label.slice(-1)}
                </span>
                <span className="flex flex-col">
                  <span className="text-[12px] font-medium text-foreground">
                    {u.label}{isMe && <span className="ml-1 text-[9.5px] text-primary">· 我</span>}
                  </span>
                  <span className="text-[9.5px] text-foreground/45">{u.handle}</span>
                </span>
              </span>
              {checked && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
          );
        })}
        <div className="mt-1 border-t border-foreground/8 px-2 pb-1 pt-1.5 text-[9.5px] leading-snug text-foreground/45">
          指派给他人的行程将以「待确认」状态送达；本人的自动确认。
        </div>
      </PopoverContent>
    </Popover>
  );
}
