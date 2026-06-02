// 高保真"多员协同"模拟账号底座 · 实名化
// 三个对等的职场用户，硬编码 UUID 便于跨设备/跨会话稳定识别

export type MockUserKey = "me" | "a" | "b";

export interface MockUser {
  key: MockUserKey;
  id: string;
  label: string;       // 人类可读姓名
  handle: string;
  avatarColor: string;
}

export const MOCK_USERS: Record<MockUserKey, MockUser> = {
  me: {
    key: "me",
    id: "11111111-1111-4111-8111-111111111111",
    label: "王羽佳",
    handle: "@wangyujia",
    avatarColor: "bg-primary/15 text-primary",
  },
  a: {
    key: "a",
    id: "22222222-2222-4222-8222-222222222222",
    label: "同事 A",
    handle: "@colleague_a",
    avatarColor: "bg-amber-100 text-amber-700",
  },
  b: {
    key: "b",
    id: "33333333-3333-4333-8333-333333333333",
    label: "同事 B",
    handle: "@colleague_b",
    avatarColor: "bg-sky-100 text-sky-700",
  },
};

export const MOCK_USER_LIST: MockUser[] = [MOCK_USERS.me, MOCK_USERS.a, MOCK_USERS.b];

export function getMockUserById(id: string | null | undefined): MockUser | null {
  if (!id) return null;
  return MOCK_USER_LIST.find((u) => u.id === id) ?? null;
}

export function isFixedMockId(id: string | null | undefined): boolean {
  if (!id) return false;
  return MOCK_USER_LIST.some((u) => u.id === id);
}

export function getMockUserLabel(id: string | null | undefined): string {
  return getMockUserById(id)?.label ?? "未知用户";
}
