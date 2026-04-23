/** @type {import('next').NextConfig} */
function normalizeBasePath(value) {
  if (!value) return "";
  let v = String(value).trim();
  if (!v) return "";
  if (!v.startsWith("/")) v = `/${v}`;
  if (v.length > 1 && v.endsWith("/")) v = v.slice(0, -1);
  return v;
}

const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

const nextConfig = {
  reactStrictMode: false,
  basePath,
  assetPrefix: basePath,
  env: {
    // Only NEXT_PUBLIC_ vars are exposed to the browser bundle.
    // ADMIN_PASSWORD and ADMIN_SECRET must NOT have the NEXT_PUBLIC_ prefix
    // — they are only accessible in server-side code (API routes, middleware).
    NEXT_PUBLIC_EIA_API_KEY: process.env.NEXT_PUBLIC_EIA_API_KEY ?? "",
  },
};

export default nextConfig;
