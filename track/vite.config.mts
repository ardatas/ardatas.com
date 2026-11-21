import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";
import tailwind from "tailwindcss";
import autoprefixer from "autoprefixer";

const root = fileURLToPath(new URL("../", import.meta.url));

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, root + "track"), ...process.env };
  if (
    Boolean(env.VITE_SUPABASE_URL) !==
    Boolean(env.VITE_SUPABASE_PUBLISHABLE_KEY)
  ) {
    throw new Error("Configure both Supabase variables together.");
  }
  if (env.VERCEL_ENV === "production" && !env.VITE_SUPABASE_URL) {
    throw new Error(
      "Production requires VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  return {
    resolve: { alias: { "@": root }, dedupe: ["react", "react-dom"] },
    server: { fs: { allow: [root] } },
    css: {
      postcss: {
        plugins: [
          tailwind({
            content: [
              root + "track/*.tsx",
              root + "components/ui/flip-clock.tsx",
            ],
            corePlugins: { preflight: false },
          }),
          autoprefixer(),
        ],
      },
    },
  };
});
