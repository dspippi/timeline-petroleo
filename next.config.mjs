/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // Only NEXT_PUBLIC_ vars are exposed to the browser bundle.
    // ADMIN_PASSWORD and ADMIN_SECRET must NOT have the NEXT_PUBLIC_ prefix
    // — they are only accessible in server-side code (API routes, middleware).
    NEXT_PUBLIC_EIA_API_KEY: process.env.NEXT_PUBLIC_EIA_API_KEY ?? "",
  },
};

export default nextConfig;
