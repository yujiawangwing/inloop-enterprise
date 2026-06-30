// Demo 同事数据（仅用于 OwnerSelector 演示协同指派的视觉效果）
// 真实「当前用户」由 Supabase Auth 注入；下方的 me 槽位仅作占位符，
// OwnerSelector / AIComposer / AddTaskSheet 会在运行时把 me.id 替换成真实 auth.uid()。

export type MockUserKey = "me" | "a" | "b";

export interface MockUser {
  key: MockUserKey;
  id: string;
  label: string;
  handle: string;
  avatarColor: string;
}

export const MOCK_USERS: Record<MockUserKey, MockUser> = {
  me: {
    key: "me",
    id: "11111111-1111-4111-8111-111111111111", // sentinel — 运行时替换为真实 auth.uid()
    label: "我",
    handle: "@me",
    avatarColor: "bg-primary/15 text-primary",
  },
  a: {
    key: "a",
    id: "22222222-2222-4222-8222-222222222222",
    label: "Demo · 同事 A",
    handle: "@colleague_a",
    avatarColor: "bg-amber-100 text-amber-700",
  },
  b: {
    key: "b",
    id: "33333333-3333-4333-8333-333333333333",
    label: "Demo · 同事 B",
    handle: "@colleague_b",
    avatarColor: "bg-sky-100 text-sky-700",
  },
};

export const MOCK_USER_LIST: MockUser[] = [MOCK_USERS.me, MOCK_USERS.a, MOCK_USERS.b];

export function getMockUserById(id: string | null | undefined): MockUser | null {
  if (!id) return null;
  return MOCK_USER_LIST.find((u) => u.id === id) ?? null;
}

/** 仅用于判断 OwnerSelector 中是否命中 demo 槽位（a/b）。真实用户 uid 永远返回 false。 */
export function isFixedMockId(id: string | null | undefined): boolean {
  if (!id) return false;
  return id === MOCK_USERS.a.id || id === MOCK_USERS.b.id;
}

export function getMockUserLabel(id: string | null | undefined): string {
  return getMockUserById(id)?.label ?? "同事";
}
