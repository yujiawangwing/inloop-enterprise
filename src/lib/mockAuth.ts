// 高保真模拟登录：登录后生成 mock user_id，全站按 user_id 隔离数据
import { MOCK_USERS, type MockUserKey } from "./mockUsers";

const USER_KEY = "inloop:mockUserId";
const USER_LABEL_KEY = "inloop:mockUserLabel";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getMockUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
}

export function getMockUserLabel(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(USER_LABEL_KEY);
  } catch {
    return null;
  }
}

/** 手机号 / 微信等通用登录：复用上次的随机 UUID（或生成新的） */
export function loginWithMock(label: string): string {
  const id = getMockUserId() ?? uuid();
  try {
    localStorage.setItem(USER_KEY, id);
    localStorage.setItem(USER_LABEL_KEY, label);
  } catch {
    /* noop */
  }
  return id;
}

/** 🔧 开发者测试通道：直接以固定 mock 用户身份登录 */
export function loginAsMockUser(key: MockUserKey): string {
  const u = MOCK_USERS[key];
  try {
    localStorage.setItem(USER_KEY, u.id);
    localStorage.setItem(USER_LABEL_KEY, u.label);
  } catch {
    /* noop */
  }
  return u.id;
}

export function logoutMock() {
  try {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(USER_LABEL_KEY);
  } catch {
    /* noop */
  }
}
