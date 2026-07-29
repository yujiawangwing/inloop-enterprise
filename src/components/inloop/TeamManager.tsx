import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, UserPlus, X, Loader2, Users } from "lucide-react";
import {
  addConnection,
  contactAvatarClass,
  contactInitial,
  findUserByContact,
  removeConnection,
  type Contact,
} from "@/lib/contacts";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string | null;
  connections: Contact[];
  onChanged: () => void;
}

export function TeamManager({ open, onOpenChange, currentUserId, connections, onChanged }: Props) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Contact[]>([]);
  const [searched, setSearched] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSearched(false);
      setMsg(null);
    }
  }, [open]);

  const existingIds = new Set(connections.map((c) => c.id));

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (q.length < 3) {
      setMsg("请输入至少 3 个字符的邮箱或手机号");
      return;
    }
    setMsg(null);
    setSearching(true);
    setSearched(true);
    try {
      const list = await findUserByContact(q);
      setResults(list.filter((u) => u.id !== currentUserId));
    } finally {
      setSearching(false);
    }
  }

  async function handleAdd(user: Contact) {
    if (!currentUserId) return;
    setBusyId(user.id);
    const { error } = await addConnection(currentUserId, user.id);
    setBusyId(null);
    if (error) {
      setMsg(`添加失败：${error}`);
      return;
    }
    setMsg(`已添加 ${user.display_name}`);
    onChanged();
  }

  async function handleRemove(user: Contact) {
    if (!currentUserId) return;
    setBusyId(user.id);
    const { error } = await removeConnection(currentUserId, user.id);
    setBusyId(null);
    if (error) {
      setMsg(`移除失败：${error}`);
      return;
    }
    setMsg(`已移除 ${user.display_name}`);
    onChanged();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-[440px] overflow-y-auto rounded-2xl border-foreground/10 bg-background p-0 sm:rounded-2xl">
        <DialogHeader className="space-y-1.5 border-b border-foreground/8 px-6 pb-4 pt-6 text-left">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-primary">
            <Users className="h-3 w-3" />
            团队成员
          </div>
          <DialogTitle className="text-[19px] font-semibold tracking-tight text-foreground">
            团队 · 联系人管理
          </DialogTitle>
          <DialogDescription className="text-[12.5px] leading-relaxed text-foreground/55">
            通过对方的邮箱或手机号搜索并添加为团队成员，之后即可在协同目标中指派。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          {/* Search */}
          <form onSubmit={handleSearch} className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              添加团队成员
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground/40" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="输入对方的邮箱 / 手机号"
                  className="h-10 w-full rounded-xl border border-foreground/20 bg-background pl-8 pr-3 text-[13px] text-foreground placeholder:text-foreground/35 focus:border-primary/50 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={searching}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 text-[12px] font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-60"
              >
                {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                搜索
              </button>
            </div>
            {msg && (
              <p className="text-[11px] text-foreground/60">{msg}</p>
            )}
          </form>

          {/* Search results */}
          {searched && (
            <div className="space-y-1.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-foreground/45">
                搜索结果
              </p>
              {results.length === 0 && !searching && (
                <p className="rounded-lg bg-foreground/[0.03] px-3 py-2.5 text-[12px] text-foreground/55">
                  没有找到匹配的用户。请确认对方已注册并核对邮箱 / 手机号是否完整。
                </p>
              )}
              {results.map((u) => {
                const already = existingIds.has(u.id);
                return (
                  <div
                    key={u.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-foreground/10 bg-card px-3 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${contactAvatarClass(u.id)}`}
                      >
                        {contactInitial(u.display_name)}
                      </span>
                      <span className="truncate text-[13px] font-medium text-foreground">
                        {u.display_name}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={busyId === u.id || already}
                      onClick={() => handleAdd(u)}
                      className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-95 disabled:cursor-not-allowed disabled:bg-foreground/10 disabled:text-foreground/50"
                    >
                      {busyId === u.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <UserPlus className="h-3 w-3" />
                      )}
                      {already ? "已添加" : "添加"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Current team */}
          <div className="space-y-1.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-foreground/45">
              我的团队 · {connections.length} 位
            </p>
            {connections.length === 0 && (
              <p className="rounded-lg bg-foreground/[0.03] px-3 py-2.5 text-[12px] text-foreground/55">
                还没有团队成员。使用上面的搜索添加第一位吧。
              </p>
            )}
            {connections.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-foreground/8 bg-background px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${contactAvatarClass(u.id)}`}
                  >
                    {contactInitial(u.display_name)}
                  </span>
                  <span className="truncate text-[13px] font-medium text-foreground">
                    {u.display_name}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={busyId === u.id}
                  onClick={() => handleRemove(u)}
                  aria-label={`移除 ${u.display_name}`}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-foreground/45 transition-all hover:bg-red-50 hover:text-red-500 active:scale-95 disabled:opacity-50"
                >
                  {busyId === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
