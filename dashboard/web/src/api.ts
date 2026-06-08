export async function api<T>(path: string): Promise<T> {
  const r = await fetch(path);
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = body?.error?.message ?? `HTTP ${r.status}`;
    throw new Error(msg);
  }
  return body.data as T;
}
