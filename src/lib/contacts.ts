// 真实联系人（团队成员）数据层。
// 通过 user_connections 表 + profiles 表联表，读取当前登录用户已添加的同事。
// 全局 contactCache 供 TaskItem / PendingInbox 等只需要名字/头像色的组件同步查询。

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** 一个占位 UUID，用来在 currentUserId 尚未加载完成时先塞进 owner_ids。
 *  index.tsx 在真正写入数据库前会用 normalize() 把它替换成 auth.uid()。 */
export const ME_SENTINEL_ID = "00000000-0000-0000-0000-000000000000";

export interface Contact {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

const AVATAR_PALETTE = [
  "bg-primary/15 text-primary",
  "bg-amber-100 text-amber-700",
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
  "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-700",
];

export function contactAvatarClass(id: string | null | undefined): string {
  if (!id) return "bg-foreground/10 text-foreground/60";
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

export function contactInitial(name: string | null | undefined): string {
  const n = (name ?? "").trim();
  if (!n) return "?";
  // 中文名取最后一个字，英文名取首字母
  const last = n.slice(-1);
  return /[A-Za-z]/.test(n) ? n.slice(0, 1).toUpperCase() : last;
}

// ————————————————————————————
// 全局同步缓存：供不便传 props 的展示组件读取
// ————————————————————————————
type CacheEntry = { display_name: string; avatar_url: string | null };
const contactCache = new Map<string, CacheEntry>();

export function primeContact(id: string | null | undefined, info: CacheEntry): void {
  if (!id) return;
  contactCache.set(id, info);
}

export function primeContacts(list: Array<{ id: string; display_name: string | null; avatar_url: string | null }>): void {
  for (const p of list) {
    if (!p.id) continue;
    contactCache.set(p.id, {
      display_name: p.display_name ?? "同事",
      avatar_url: p.avatar_url ?? null,
    });
  }
}

export function getContactLabel(id: string | null | undefined, fallback: string = "同事"): string {
  if (!id) return fallback;
  return contactCache.get(id)?.display_name ?? fallback;
}

// ————————————————————————————
// Hook：加载当前用户的联系人
// ————————————————————————————
export function useContacts(currentUserId: string | null, currentDisplayName: string | null) {
  const [others, setOthers] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!currentUserId) {
      setOthers([]);
      return;
    }
    setLoading(true);
    try {
      const { data: conns } = await supabase
        .from("user_connections")
        .select("connected_user_id")
        .eq("user_id", currentUserId);
      const ids = (conns ?? []).map((r) => r.connected_user_id as string);
      if (ids.length === 0) {
        setOthers([]);
        return;
      }
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", ids);
      const list: Contact[] = (profs ?? []).map((p) => ({
        id: p.id,
        display_name: p.display_name ?? "同事",
        avatar_url: p.avatar_url ?? null,
      }));
      primeContacts(list);
      list.sort((a, b) => a.display_name.localeCompare(b.display_name, "zh"));
      setOthers(list);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (currentUserId && currentDisplayName) {
      primeContact(currentUserId, { display_name: currentDisplayName, avatar_url: null });
    }
  }, [currentUserId, currentDisplayName]);

  const meId = currentUserId ?? ME_SENTINEL_ID;
  const me: Contact = {
    id: meId,
    display_name: currentDisplayName ?? "我",
    avatar_url: null,
  };
  const all: Contact[] = [me, ...others];

  return { me, others, all, loading, reload };
}

// ————————————————————————————
// 团队成员管理：搜索 + 添加 + 删除
// ————————————————————————————
export async function findUserByContact(contact: string): Promise<Contact[]> {
  const trimmed = contact.trim();
  if (trimmed.length < 3) return [];
  const { data, error } = await supabase.rpc("find_user_by_contact", { contact: trimmed });
  if (error) {
    console.warn("find_user_by_contact failed:", error);
    return [];
  }
  return (data ?? []).map((r: { id: string; display_name: string | null; avatar_url: string | null }) => ({
    id: r.id,
    display_name: r.display_name ?? "同事",
    avatar_url: r.avatar_url ?? null,
  }));
}

export async function addConnection(currentUserId: string, connectedUserId: string): Promise<{ error: string | null }> {
  if (currentUserId === connectedUserId) return { error: "不能添加自己" };
  const { error } = await supabase
    .from("user_connections")
    .insert({ user_id: currentUserId, connected_user_id: connectedUserId });
  if (error) {
    // 唯一约束（已存在）视为幂等成功
    if (error.code === "23505") return { error: null };
    return { error: error.message };
  }
  return { error: null };
}

export async function removeConnection(currentUserId: string, connectedUserId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("user_connections")
    .delete()
    .eq("user_id", currentUserId)
    .eq("connected_user_id", connectedUserId);
  return { error: error?.message ?? null };
}
