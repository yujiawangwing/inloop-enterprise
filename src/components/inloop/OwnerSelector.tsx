import { useState } from "react";
import { Users, Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  contactAvatarClass,
  contactInitial,
  ME_SENTINEL_ID,
  type Contact,
} from "@/lib/contacts";

interface Props {
  value: string[];                       // 当前勾选的 owner_id 列表
  onChange: (next: string[]) => void;
  contacts: Contact[];                   // [me, ...connections]
  meId: string;                          // 真实 auth uid（或 sentinel）
  size?: "sm" | "md";
  align?: "start" | "end";
  onManage?: () => void;                 // 点击"管理团队"入口
}

/** 协同目标选择器 (To:) — 从真实 user_connections 读取列表 */
export function OwnerSelector({
  value,
  onChange,
  contacts,
  meId,
  size = "md",
  align = "start",
  onManage,
}: Props) {
  const [open, setOpen] = useState(false);
  const compact = size === "sm";

  const isMeId = (id: string) => id === meId || id === ME_SENTINEL_ID;

  function toggle(id: string) {
    if (value.includes(id)) {
      if (value.length === 1) return; // 至少留 1 个
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  }

  const contactById = new Map(contacts.map((c) => [c.id, c]));
  const selectedUsers = value.map((id) => {
    if (isMeId(id)) return contactById.get(meId) ?? contacts.find((c) => c.id === ME_SENTINEL_ID) ?? contacts[0];
    return contactById.get(id);
  }).filter((u): u is Contact => Boolean(u));

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
                    contactAvatarClass(u.id),
                    isMe && "ring-1 ring-primary/30",
                  )}
                >
                  {isMe ? `${u.display_name} · 我` : u.display_name}
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
        className="w-60 rounded-xl border-foreground/10 bg-card p-1.5 shadow-[0_8px_30px_-12px_rgba(34,34,34,0.18)]"
      >
        <div className="px-2 py-1.5 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-foreground/45">
          协同目标 · 可多选
        </div>
        {contacts.map((u) => {
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
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className={cn(
                    "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold leading-none",
                    contactAvatarClass(u.id),
                  )}
                >
                  {contactInitial(u.display_name)}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[12px] font-medium text-foreground">
                    {u.display_name}{isMe && <span className="ml-1 text-[9.5px] text-primary">· 我</span>}
                  </span>
                </span>
              </span>
              {checked && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
            </button>
          );
        })}
        {contacts.length <= 1 && (
          <div className="mx-1 mt-1 rounded-lg bg-foreground/[0.03] px-2 py-2 text-[10.5px] leading-relaxed text-foreground/55">
            尚未添加团队成员。点击下方「管理团队」按邮箱或手机号搜索添加。
          </div>
        )}
        {onManage && (
          <button
            type="button"
            onClick={() => { setOpen(false); onManage(); }}
            className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-foreground/15 px-2 py-1.5 text-[11px] font-medium text-foreground/65 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
          >
            + 管理团队成员
          </button>
        )}
        <div className="mt-1 border-t border-foreground/8 px-2 pb-1 pt-1.5 text-[9.5px] leading-snug text-foreground/45">
          指派给他人的行程将以「待确认」状态送达；本人的自动确认。
        </div>
      </PopoverContent>
    </Popover>
  );
}
