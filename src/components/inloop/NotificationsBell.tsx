import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Check, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface NotificationRow {
  id: string;
  receiver_id: string;
  sender_id: string;
  title: string;
  content: string | null;
  task_id: string | null;
  is_read: boolean;
  created_at: string;
}

interface Props {
  userId: string | null;
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (diff < 60_000) return "刚刚";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小时前`;
  return `${Math.floor(diff / 86400_000)} 天前`;
}

export function NotificationsBell({ userId }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("receiver_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    setItems((data ?? []) as NotificationRow[]);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    load();
    const channel = supabase
      .channel(`notifications-rt-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `receiver_id=eq.${userId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const unread = items.filter((n) => !n.is_read).length;

  async function markAllRead() {
    if (!userId || unread === 0) return;
    setItems((xs) => xs.map((n) => ({ ...n, is_read: true })));
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("receiver_id", userId)
      .eq("is_read", false);
  }

  async function markOneRead(id: string) {
    setItems((xs) => xs.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  }

  async function removeOne(id: string) {
    setItems((xs) => xs.filter((n) => n.id !== id));
    await supabase.from("notifications").delete().eq("id", id);
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="消息通知"
        className="relative inline-flex h-7 w-7 items-center justify-center rounded-full text-foreground/70 transition-all hover:bg-foreground/5 hover:text-foreground active:scale-95"
      >
        <Bell className="h-[15px] w-[15px] stroke-[1.75]" />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 inline-flex h-2 w-2 items-center justify-center rounded-full bg-red-500 ring-2 ring-background" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-40 w-[calc(100vw-3rem)] max-w-[340px] overflow-hidden rounded-xl border border-foreground/10 bg-card shadow-[0_10px_40px_-10px_rgba(34,34,34,0.25)]">
          <div className="flex items-center justify-between gap-2 border-b border-foreground/5 bg-gradient-to-br from-foreground/[0.02] to-transparent px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bell className="h-3 w-3" />
              </span>
              <p className="text-[12px] font-semibold text-foreground">
                消息中心
                {unread > 0 && (
                  <span className="ml-1.5 rounded-full bg-red-500/12 px-1.5 py-0.5 text-[9.5px] font-bold text-red-600">
                    {unread} 未读
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  <Check className="h-3 w-3" />
                  全部已读
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="关闭"
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-foreground/50 hover:bg-foreground/5 hover:text-foreground/80"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-1.5 px-6 py-10 text-center">
                <Bell className="h-6 w-6 text-foreground/20" />
                <p className="text-[11.5px] text-foreground/45">暂无通知</p>
              </div>
            ) : (
              <ul className="divide-y divide-foreground/5">
                {items.map((n) => (
                  <li
                    key={n.id}
                    className={cn(
                      "group flex items-start gap-2.5 px-3.5 py-2.5 transition-colors",
                      !n.is_read && "bg-primary/[0.04]",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1 inline-flex h-1.5 w-1.5 shrink-0 rounded-full",
                        n.is_read ? "bg-transparent" : "bg-red-500",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold leading-snug text-foreground">
                        {n.title}
                      </p>
                      {n.content && (
                        <p className="mt-0.5 break-words text-[11px] leading-relaxed text-foreground/65">
                          {n.content}
                        </p>
                      )}
                      <p className="mt-1 text-[9.5px] text-foreground/40">
                        {formatRelative(n.created_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {!n.is_read && (
                        <button
                          type="button"
                          onClick={() => markOneRead(n.id)}
                          aria-label="标记已读"
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-foreground/50 hover:bg-foreground/5 hover:text-primary"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeOne(n.id)}
                        aria-label="删除"
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-foreground/50 hover:bg-red-500/10 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
