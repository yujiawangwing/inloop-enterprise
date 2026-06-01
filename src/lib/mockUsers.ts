// 高保真“多员协同”模拟账号底座
// 三个对等的职场用户，硬编码 UUID 便于跨设备/跨会话稳定识别
// 后续阶段一旦接入真实 Auth，只需把这里的 ID 映射替换为真实 user.id 即可

export interface MockUser {
  id: string;
  label: string;       // 人类可读姓名
  handle: string;      // @用户名
  avatarColor: string; // 头像底色 tailwind class
}

export const MOCK_USERS: Record<"me" | "a" | "b", MockUser> = {
  me: {
    id: "11111111-1111-4111-8111-111111111111",
    label: "User_Me",
    handle: "@me",
    avatarColor: "bg-primary/15 text-primary",
  },
  a: {
    id: "22222222-2222-4222-8222-222222222222",
    label: "User_A",
    handle: "@colleague_a",
    avatarColor: "bg-amber-100 text-amber-700",
  },
  b: {
    id: "33333333-3333-4333-8333-333333333333",
    label: "User_B",
    handle: "@colleague_b",
    avatarColor: "bg-sky-100 text-sky-700",
  },
};

export const MOCK_USER_LIST: MockUser[] = [MOCK_USERS.me, MOCK_USERS.a, MOCK_USERS.b];

export function getMockUserById(id: string | null | undefined): MockUser | null {
  if (!id) return null;
  return MOCK_USER_LIST.find((u) => u.id === id) ?? null;
}
