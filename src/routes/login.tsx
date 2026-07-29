import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Smartphone, Mail, Lock, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

type Mode = "signin" | "signup";

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [placeholderToast, setPlaceholderToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  // 已登录则直接跳主控台
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) {
        navigate({ to: "/", replace: true });
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "SIGNED_IN" && session) {
        navigate({ to: "/", replace: true });
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  function fireComingSoonToast(label: string) {
    setPlaceholderToast(`${label} 即将上线，请先用邮箱密码登录。`);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setPlaceholderToast(null), 2400) as unknown as number;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setNotice(null);
    if (!email.trim() || !password) {
      setErrorMsg("请输入邮箱和密码");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "signup") {
        if (password.length < 6) {
          setErrorMsg("密码至少 6 位");
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: displayName.trim() ? { display_name: displayName.trim() } : undefined,
          },
        });
        if (error) {
          setErrorMsg(error.message);
          return;
        }
        setNotice("注册成功！如开启了邮箱确认，请前往收件箱激活；否则可直接登录。");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          setErrorMsg(error.message);
          return;
        }
        // 跳转由 onAuthStateChange 接管
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen w-full bg-gradient-to-br from-neutral-50 via-stone-50 to-neutral-100">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 py-10 md:max-w-lg">
        <div className="mb-10 text-center">
          <h1 className="text-[34px] font-semibold tracking-tight text-foreground">InLoop</h1>
          <p className="mt-2 text-[10.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            HIGH-IQ EXECUTIVE AGENDA COLLABORATION AGENT
          </p>
          <p className="mt-4 text-[12.5px] leading-relaxed text-foreground/55">
            高智感日程协同 · 企业级智能控制台
          </p>
        </div>

        <div className="w-full rounded-3xl border border-foreground/10 bg-card/80 p-7 shadow-[0_1px_2px_rgba(34,34,34,0.04),0_24px_60px_-24px_rgba(34,34,34,0.18)] backdrop-blur">
          {/* 占位 · 微信一键登录 */}
          <button
            type="button"
            onClick={() => fireComingSoonToast("微信一键登录")}
            className="flex w-full items-center justify-center gap-2.5 rounded-full bg-[#07c160]/90 py-3.5 text-[14px] font-medium text-white shadow-[0_10px_28px_-12px_rgba(7,193,96,0.55)] transition-all active:scale-[0.98]"
          >
            <MessageCircle className="h-4 w-4" />
            微信一键登录
            <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-medium tracking-widest">
              即将上线
            </span>
          </button>

          {/* 占位 · 手机号登录 */}
          <button
            type="button"
            onClick={() => fireComingSoonToast("手机号 + 短信验证码")}
            className="mt-2.5 flex w-full items-center justify-center gap-2.5 rounded-full border border-foreground/15 bg-card py-3 text-[13px] font-medium text-foreground/75 transition-all hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98]"
          >
            <Smartphone className="h-4 w-4" />
            手机号 + 短信验证码
            <span className="ml-1 rounded-full bg-foreground/10 px-1.5 py-0.5 text-[9px] font-medium tracking-widest text-foreground/55">
              即将上线
            </span>
          </button>

          <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.24em] text-foreground/35">
            <span className="h-px flex-1 bg-foreground/10" />
            邮箱登录
            <span className="h-px flex-1 bg-foreground/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <div className="flex items-center gap-2 rounded-xl border border-foreground/15 bg-background px-3 py-2.5 focus-within:border-primary">
                <ShieldCheck className="h-4 w-4 text-foreground/40" />
                <input
                  type="text"
                  maxLength={32}
                  placeholder="显示名（可选）"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="flex-1 border-0 bg-transparent text-[14px] text-foreground placeholder:text-foreground/35 focus:outline-none"
                />
              </div>
            )}

            <div className="flex items-center gap-2 rounded-xl border border-foreground/15 bg-background px-3 py-2.5 focus-within:border-primary">
              <Mail className="h-4 w-4 text-foreground/40" />
              <input
                type="email"
                autoComplete="email"
                placeholder="邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 border-0 bg-transparent text-[14px] text-foreground placeholder:text-foreground/35 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-foreground/15 bg-background px-3 py-2.5 focus-within:border-primary">
              <Lock className="h-4 w-4 text-foreground/40" />
              <input
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                placeholder={mode === "signup" ? "密码（≥6 位）" : "密码"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 border-0 bg-transparent text-[14px] text-foreground placeholder:text-foreground/35 focus:outline-none"
              />
            </div>

            {errorMsg && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-[11.5px] leading-snug text-red-700">
                {errorMsg}
              </p>
            )}
            {notice && (
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-[11.5px] leading-snug text-emerald-700">
                {notice}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-full bg-foreground py-3.5 text-[14px] font-medium text-background transition-all active:scale-[0.98]",
                submitting && "opacity-60",
              )}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting
                ? mode === "signin" ? "登录中..." : "注册中..."
                : mode === "signin" ? "登录进入控制台" : "创建账户"}
            </button>
          </form>

          <div className="mt-4 text-center text-[11.5px] text-foreground/55">
            {mode === "signin" ? (
              <>
                还没有账户？{" "}
                <button
                  type="button"
                  onClick={() => { setMode("signup"); setErrorMsg(null); setNotice(null); }}
                  className="font-medium text-primary hover:underline"
                >
                  立即注册
                </button>
              </>
            ) : (
              <>
                已有账户？{" "}
                <button
                  type="button"
                  onClick={() => { setMode("signin"); setErrorMsg(null); setNotice(null); }}
                  className="font-medium text-primary hover:underline"
                >
                  返回登录
                </button>
              </>
            )}
          </div>

          <p className="mt-6 text-center text-[10px] leading-relaxed text-foreground/40">
            登录即代表同意《InLoop 企业服务协议》与《隐私政策》
          </p>
        </div>

        <p className="mt-6 text-[10px] tracking-wide text-foreground/35">
          Supabase Auth · 真实邮箱密码登录
        </p>
      </div>

      {placeholderToast && (
        <div className="pointer-events-none fixed inset-x-0 top-6 z-50 mx-auto flex justify-center">
          <div className="pointer-events-auto rounded-full bg-foreground/90 px-4 py-2 text-[12px] font-medium text-background shadow-lg backdrop-blur">
            {placeholderToast}
          </div>
        </div>
      )}
    </main>
  );
}
