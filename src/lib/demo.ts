// Demo account configuration
export const DEMO_EMAIL = "demo@yasolution.com";
export const DEMO_USER_ID = "113d9406-dff9-4dd8-ac23-6cf31dfb286c";

export function isDemoUser(session: { user?: { id?: string | null; email?: string | null } } | null): boolean {
  return session?.user?.id === DEMO_USER_ID || session?.user?.email === DEMO_EMAIL;
}
