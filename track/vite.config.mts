import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";
import tailwind from "tailwindcss";
import autoprefixer from "autoprefixer";

const root = fileURLToPath(new URL("../", import.meta.url));

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, root + "track"), ...process.env };
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      "Track requires VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  const apiOrigin = new URL(env.VITE_SUPABASE_URL).origin;
  return {
    plugins: [
      {
        name: "track-content-security-policy",
        apply: "build",
        transformIndexHtml() {
          return [
            {
              tag: "meta",
              attrs: {
                "http-equiv": "Content-Security-Policy",
                content: [
                  "default-src 'none'",
                  "script-src 'self'",
                  "style-src 'self' 'unsafe-inline'",
                  "img-src 'self' data:",
                  "font-src 'self'",
                  "connect-src 'self' " + apiOrigin,
                  "base-uri 'none'",
                  "form-action 'none'",
                ].join("; "),
              },
              injectTo: "head-prepend",
            },
          ];
        },
      },
    ],
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
