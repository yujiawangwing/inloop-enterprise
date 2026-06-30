// 受保护路由子树 · 客户端会话守卫
// 真实 Supabase 会话存储在 localStorage 中，因此 SSR 不可见 → 关闭 SSR 避免重定向死循环。
// 未登录用户在 beforeLoad 阶段重定向到 /login。
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/login" });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
