export function validateLocalPath(input: unknown): string | null {
  if (typeof input !== "string") return null;
  if (!/^\/var\/www\/[A-Za-z0-9._-]+$/.test(input)) return null;
  return input;
}
