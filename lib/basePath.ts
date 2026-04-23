function normalizeBasePath(value: string | undefined): string {
  if (!value) return "";
  let v = value.trim();
  if (!v) return "";
  if (!v.startsWith("/")) v = `/${v}`;
  if (v.length > 1 && v.endsWith("/")) v = v.slice(0, -1);
  return v;
}

export const BASE_PATH = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

export function withBasePath(path: string): string {
  if (!path.startsWith("/")) {
    throw new Error(`withBasePath: path must start with "/" (got "${path}")`);
  }
  return `${BASE_PATH}${path}`;
}

