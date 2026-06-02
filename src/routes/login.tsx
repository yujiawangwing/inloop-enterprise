import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Smartphone, ShieldCheck } from "lucide-react";
import { loginWithMock, getMockUserId, loginAsMockUser } from "@/lib/mockAuth";
import { MOCK_USER_LIST } from "@/lib/mockUsers";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [wechatLoading, setWechatLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [codeSent, setCodeSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef<number | null>(null);

  // 已登录则直接进入主控制台
  useEffect(() => {
    if (getMockUserId()) {
      navigate({ to: "/", replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  function startCountdown() {
    setCountdown(60);
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000) as unknown as number;
  }

  function sendCode() {
    if (!/^\d{11}$/.test(phone)) {
      alert("请输入 11 位手机号");
      return;
    }
    setCodeSent(true);
    startCountdown();
  }

  async function loginByPhone() {
    if (!/^\d{4}$/.test(code)) {
      alert("请输入 4 位验证码");
      return;
    }
    setSubmitting(true);
    loginWithMock(`手机用户 · ${phone.slice(-4)}`);
    await new Promise((r) => setTimeout(r, 400));
    navigate({ to: "/", replace: true });
  }

  async function loginByWechat() {
    setWechatLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    loginWithMock("微信用户");
    navigate({ to: "/", replace: true });
  }

  return (
    <main className="relative min-h-screen w-full bg-gradient-to-br from-neutral-50 via-stone-50 to-neutral-100">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 py-10 md:max-w-lg">
        <div className="mb-10 text-center">
          <h1 className="text-[34px] font-semibold tracking-tight text-foreground">
            InLoop
          </h1>
          <p className="mt-2 text-[10.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            HIGH-IQ EXECUTIVE AGENDA COLLABORATION AGENT
          </p>
          <p className="mt-4 text-[12.5px] leading-relaxed text-foreground/55">
            高智感日程协同 · 企业级智能控制台
          </p>
        </div>

        <div className="w-full rounded-3xl border border-foreground/10 bg-card/80 p-7 shadow-[0_1px_2px_rgba(34,34,34,0.04),0_24px_60px_-24px_rgba(34,34,34,0.18)] backdrop-blur">
          {/* 微信一键登录 */}
          <button
            type="button"
            disabled={wechatLoading}
            onClick={loginByWechat}
            className={cn(
              "flex w-full items-center justify-center gap-2.5 rounded-full bg-[#07c160] py-3.5 text-[14px] font-medium text-white shadow-[0_10px_28px_-12px_rgba(7,193,96,0.6)] transition-all active:scale-[0.98]",
              wechatLoading && "opacity-80",
            )}
          >
            {wechatLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageCircle className="h-4 w-4" />
            )}
            {wechatLoading ? "正在唤起微信授权..." : "微信一键登录"}
          </button>

          <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.24em] text-foreground/35">
            <span className="h-px flex-1 bg-foreground/10" />
            或
            <span className="h-px flex-1 bg-foreground/10" />
          </div>

          {/* 手机号快捷登录 */}
          <div className="space-y-3">
            <label className="block text-[10.5px] font-medium uppercase tracking-[0.18em] text-foreground/55">
              手机号快捷登录
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-foreground/15 bg-background px-3 py-2.5 focus-within:border-primary">
              <Smartphone className="h-4 w-4 text-foreground/40" />
              <span className="text-[13px] text-foreground/55">+86</span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={11}
                placeholder="请输入手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                className="flex-1 border-0 bg-transparent text-[14px] text-foreground placeholder:text-foreground/35 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-foreground/15 bg-background px-3 py-2.5 focus-within:border-primary">
              <ShieldCheck className="h-4 w-4 text-foreground/40" />
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="4 位验证码"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="flex-1 border-0 bg-transparent text-[14px] text-foreground placeholder:text-foreground/35 focus:outline-none"
              />
              <button
                type="button"
                disabled={countdown > 0}
                onClick={sendCode}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-[11.5px] font-medium tracking-wide transition-all",
                  countdown > 0
                    ? "bg-foreground/8 text-foreground/40"
                    : "bg-primary/10 text-primary hover:bg-primary/15",
                )}
              >
                {countdown > 0 ? `${countdown}s 后重发` : codeSent ? "重新发送" : "获取验证码"}
              </button>
            </div>
            <button
              type="button"
              disabled={submitting || !codeSent}
              onClick={loginByPhone}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-full bg-foreground py-3.5 text-[14px] font-medium text-background transition-all active:scale-[0.98]",
                (!codeSent || submitting) && "opacity-60",
              )}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "登录中..." : "登录进入控制台"}
            </button>
          </div>

          <p className="mt-6 text-center text-[10px] leading-relaxed text-foreground/40">
            登录即代表同意《InLoop 企业服务协议》与《隐私政策》
          </p>

          {/* 🔧 开发者测试通道 · 一键以固定身份进入，便于多端协同测试 */}
          <div className="mt-5 rounded-2xl border border-dashed border-foreground/15 bg-foreground/[0.02] p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-foreground/50">
              <span>🔧</span>
              <span>开发者测试通道</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MOCK_USER_LIST.map((u) => (
                <button
                  key={u.key}
                  type="button"
                  onClick={() => {
                    loginAsMockUser(u.key);
                    navigate({ to: "/", replace: true });
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border border-foreground/12 bg-card px-3 py-1.5 text-[11.5px] font-medium text-foreground/80 transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary active:scale-[0.97]",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold leading-none",
                      u.avatarColor,
                    )}
                  >
                    {u.label.slice(-1)}
                  </span>
                  {u.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[9.5px] leading-snug text-foreground/40">
              点击任意身份即模拟登录，可在主页右上角随时切换账户。
            </p>
          </div>
        </div>

        <p className="mt-6 text-[10px] tracking-wide text-foreground/35">
          高保真模拟环境 · 任意 4 位验证码即可进入
        </p>
      </div>
    </main>
  );
}
