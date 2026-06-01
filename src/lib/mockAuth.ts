// 高保真模拟登录：登录后生成 mock user_id，全站按 user_id 隔离数据
// 后续接入真实 Supabase Auth 时，把 getMockUserId() 替换为 supabase.auth.getUser() 即可
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

export function logoutMock() {
  try {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(USER_LABEL_KEY);
  } catch {
    /* noop */
  }
}
