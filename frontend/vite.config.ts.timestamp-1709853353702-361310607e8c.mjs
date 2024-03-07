// vite.config.ts
import { rmSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "file:///Users/jon/zetaforge/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///Users/jon/zetaforge/frontend/node_modules/@vitejs/plugin-react/dist/index.mjs";
import electron from "file:///Users/jon/zetaforge/frontend/node_modules/vite-plugin-electron/dist/simple.mjs";

// package.json
var package_default = {
  name: "zetaforge",
  version: "0.0.1",
  main: "dist-electron/main/index.js",
  description: "Zetaforge Client",
  author: "Zetane <info@zetane.com>",
  license: "AGPL-3.0-only",
  private: true,
  debug: {
    env: {
      VITE_DEV_SERVER_URL: "http://127.0.0.1:7777/"
    }
  },
  type: "module",
  scripts: {
    dev: "vite",
    build: "tsc && vite build && electron-builder",
    preview: "vite preview",
    pree2e: "vite build --mode=test",
    e2e: "playwright test",
    lint: "next lint",
    format: "prettier --check ."
  },
  dependencies: {
    "@carbon/colors": "^11.20.0",
    "@carbon/react": "^1.42.0",
    "@carbon/styles": "^1.42.0",
    "@carbon/themes": "^11.27.0",
    "@codemirror/view": "^6.23.0",
    "@fortawesome/fontawesome-free": "^6.5.1",
    "@fortawesome/fontawesome-svg-core": "^6.5.1",
    "@tanstack/react-query": "^4.36.1",
    "@trpc/react-query": "^10.45.1",
    "@uiw/codemirror-extensions-langs": "^4.21.21",
    "@uiw/codemirror-theme-vscode": "^4.21.21",
    "@uiw/react-codemirror": "^4.21.21",
    ajax: "^0.0.4",
    axios: "^1.6.7",
    "body-parser": "^1.20.2",
    compression: "^1.7.4",
    cors: "^2.8.5",
    dotenv: "^16.3.1",
    "electron-trpc": "^0.5.2",
    "electron-updater": "^6.1.1",
    express: "^4.18.2",
    immer: "^10.0.3",
    isbot: "^4.4.0",
    jotai: "^2.5.1",
    "jotai-immer": "^0.3.0",
    jquery: "^3.7.1",
    "json-formatter-js": "^2.3.4",
    micromodal: "^0.4.10",
    "monaco-editor": "^0.44.0",
    multer: "^1.4.5-lts.1",
    nanoid: "^5.0.5",
    "node-file-dialog": "^1.0.3",
    openai: "^3.3.0",
    pg: "^8.11.3",
    zod: "^3.22.4"
  },
  devDependencies: {
    "@playwright/test": "^1.37.1",
    "@types/react": "^18.2.20",
    "@types/react-dom": "^18.2.7",
    "@vitejs/plugin-react": "^4.0.4",
    autoprefixer: "^10.4.16",
    electron: "^28.1.0",
    "electron-builder": "^24.6.3",
    eslint: "^8.55.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-prettier": "^5.0.1",
    "eslint-plugin-react": "^7.33.2",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.5",
    postcss: "^8",
    "prettier-plugin-tailwindcss": "^0.5.11",
    react: "^18.2.0",
    "react-dom": "^18.2.0",
    sass: "^1.69.7",
    tailwindcss: "^3.4.0",
    "tree-kill": "^1.2.2",
    typescript: "^5.1.6",
    vite: "^5.0.10",
    "vite-plugin-electron": "^0.28.0",
    "vite-plugin-electron-renderer": "^0.14.5"
  }
};

// vite.config.ts
var __vite_injected_original_dirname = "/Users/jon/zetaforge/frontend";
var vite_config_default = defineConfig(({ command }) => {
  rmSync("dist-electron", { recursive: true, force: true });
  const isServe = command === "serve";
  const isBuild = command === "build";
  const sourcemap = isServe || !!process.env.VSCODE_DEBUG;
  return {
    resolve: {
      alias: {
        "@": path.join(__vite_injected_original_dirname, "src")
      }
    },
    plugins: [
      react(),
      electron({
        main: {
          // Shortcut of `build.lib.entry`
          entry: "electron/main/index.ts",
          onstart(args) {
            if (process.env.VSCODE_DEBUG) {
              console.log(
                /* For `.vscode/.debug.script.mjs` */
                "[startup] Electron App"
              );
            } else {
              args.startup();
            }
          },
          vite: {
            build: {
              sourcemap,
              minify: isBuild,
              outDir: "dist-electron/main",
              rollupOptions: {
                external: Object.keys("dependencies" in package_default ? package_default.dependencies : {})
              }
            }
          }
        },
        preload: {
          // Shortcut of `build.rollupOptions.input`.
          // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
          input: "electron/preload/index.ts",
          vite: {
            build: {
              sourcemap: sourcemap ? "inline" : void 0,
              // #332
              minify: isBuild,
              outDir: "dist-electron/preload",
              rollupOptions: {
                external: Object.keys("dependencies" in package_default ? package_default.dependencies : {})
              }
            }
          }
        },
        // Ployfill the Electron and Node.js API for Renderer process.
        // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
        // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
        renderer: {}
      })
    ],
    server: process.env.VSCODE_DEBUG && (() => {
      const url = new URL(package_default.debug.env.VITE_DEV_SERVER_URL);
      return {
        host: url.hostname,
        port: +url.port
      };
    })(),
    clearScreen: false
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAicGFja2FnZS5qc29uIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL2pvbi96ZXRhZm9yZ2UvZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9qb24vemV0YWZvcmdlL2Zyb250ZW5kL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9qb24vemV0YWZvcmdlL2Zyb250ZW5kL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgcm1TeW5jIH0gZnJvbSAnbm9kZTpmcydcbmltcG9ydCBwYXRoIGZyb20gJ25vZGU6cGF0aCdcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnXG5pbXBvcnQgZWxlY3Ryb24gZnJvbSAndml0ZS1wbHVnaW4tZWxlY3Ryb24vc2ltcGxlJ1xuaW1wb3J0IHBrZyBmcm9tICcuL3BhY2thZ2UuanNvbidcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBjb21tYW5kIH0pID0+IHtcbiAgcm1TeW5jKCdkaXN0LWVsZWN0cm9uJywgeyByZWN1cnNpdmU6IHRydWUsIGZvcmNlOiB0cnVlIH0pXG5cbiAgY29uc3QgaXNTZXJ2ZSA9IGNvbW1hbmQgPT09ICdzZXJ2ZSdcbiAgY29uc3QgaXNCdWlsZCA9IGNvbW1hbmQgPT09ICdidWlsZCdcbiAgY29uc3Qgc291cmNlbWFwID0gaXNTZXJ2ZSB8fCAhIXByb2Nlc3MuZW52LlZTQ09ERV9ERUJVR1xuXG4gIHJldHVybiB7XG4gICAgcmVzb2x2ZToge1xuICAgICAgYWxpYXM6IHtcbiAgICAgICAgJ0AnOiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnc3JjJylcbiAgICAgIH0sXG4gICAgfSxcbiAgICBwbHVnaW5zOiBbXG4gICAgICByZWFjdCgpLFxuICAgICAgZWxlY3Ryb24oe1xuICAgICAgICBtYWluOiB7XG4gICAgICAgICAgLy8gU2hvcnRjdXQgb2YgYGJ1aWxkLmxpYi5lbnRyeWBcbiAgICAgICAgICBlbnRyeTogJ2VsZWN0cm9uL21haW4vaW5kZXgudHMnLFxuICAgICAgICAgIG9uc3RhcnQoYXJncykge1xuICAgICAgICAgICAgaWYgKHByb2Nlc3MuZW52LlZTQ09ERV9ERUJVRykge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZygvKiBGb3IgYC52c2NvZGUvLmRlYnVnLnNjcmlwdC5tanNgICovJ1tzdGFydHVwXSBFbGVjdHJvbiBBcHAnKVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgYXJncy5zdGFydHVwKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIHZpdGU6IHtcbiAgICAgICAgICAgIGJ1aWxkOiB7XG4gICAgICAgICAgICAgIHNvdXJjZW1hcCxcbiAgICAgICAgICAgICAgbWluaWZ5OiBpc0J1aWxkLFxuICAgICAgICAgICAgICBvdXREaXI6ICdkaXN0LWVsZWN0cm9uL21haW4nLFxuICAgICAgICAgICAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgZXh0ZXJuYWw6IE9iamVjdC5rZXlzKCdkZXBlbmRlbmNpZXMnIGluIHBrZyA/IHBrZy5kZXBlbmRlbmNpZXMgOiB7fSksXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIHByZWxvYWQ6IHtcbiAgICAgICAgICAvLyBTaG9ydGN1dCBvZiBgYnVpbGQucm9sbHVwT3B0aW9ucy5pbnB1dGAuXG4gICAgICAgICAgLy8gUHJlbG9hZCBzY3JpcHRzIG1heSBjb250YWluIFdlYiBhc3NldHMsIHNvIHVzZSB0aGUgYGJ1aWxkLnJvbGx1cE9wdGlvbnMuaW5wdXRgIGluc3RlYWQgYGJ1aWxkLmxpYi5lbnRyeWAuXG4gICAgICAgICAgaW5wdXQ6ICdlbGVjdHJvbi9wcmVsb2FkL2luZGV4LnRzJyxcbiAgICAgICAgICB2aXRlOiB7XG4gICAgICAgICAgICBidWlsZDoge1xuICAgICAgICAgICAgICBzb3VyY2VtYXA6IHNvdXJjZW1hcCA/ICdpbmxpbmUnIDogdW5kZWZpbmVkLCAvLyAjMzMyXG4gICAgICAgICAgICAgIG1pbmlmeTogaXNCdWlsZCxcbiAgICAgICAgICAgICAgb3V0RGlyOiAnZGlzdC1lbGVjdHJvbi9wcmVsb2FkJyxcbiAgICAgICAgICAgICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgICAgICAgICAgIGV4dGVybmFsOiBPYmplY3Qua2V5cygnZGVwZW5kZW5jaWVzJyBpbiBwa2cgPyBwa2cuZGVwZW5kZW5jaWVzIDoge30pLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICAvLyBQbG95ZmlsbCB0aGUgRWxlY3Ryb24gYW5kIE5vZGUuanMgQVBJIGZvciBSZW5kZXJlciBwcm9jZXNzLlxuICAgICAgICAvLyBJZiB5b3Ugd2FudCB1c2UgTm9kZS5qcyBpbiBSZW5kZXJlciBwcm9jZXNzLCB0aGUgYG5vZGVJbnRlZ3JhdGlvbmAgbmVlZHMgdG8gYmUgZW5hYmxlZCBpbiB0aGUgTWFpbiBwcm9jZXNzLlxuICAgICAgICAvLyBTZWUgXHVEODNEXHVEQzQ5IGh0dHBzOi8vZ2l0aHViLmNvbS9lbGVjdHJvbi12aXRlL3ZpdGUtcGx1Z2luLWVsZWN0cm9uLXJlbmRlcmVyXG4gICAgICAgIHJlbmRlcmVyOiB7fSxcbiAgICAgIH0pLFxuICAgIF0sXG4gICAgc2VydmVyOiBwcm9jZXNzLmVudi5WU0NPREVfREVCVUcgJiYgKCgpID0+IHtcbiAgICAgIGNvbnN0IHVybCA9IG5ldyBVUkwocGtnLmRlYnVnLmVudi5WSVRFX0RFVl9TRVJWRVJfVVJMKVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaG9zdDogdXJsLmhvc3RuYW1lLFxuICAgICAgICBwb3J0OiArdXJsLnBvcnQsXG4gICAgICB9XG4gICAgfSkoKSxcbiAgICBjbGVhclNjcmVlbjogZmFsc2UsXG4gIH1cbn0pXG4iLCAie1xuICBcIm5hbWVcIjogXCJ6ZXRhZm9yZ2VcIixcbiAgXCJ2ZXJzaW9uXCI6IFwiMC4wLjFcIixcbiAgXCJtYWluXCI6IFwiZGlzdC1lbGVjdHJvbi9tYWluL2luZGV4LmpzXCIsXG4gIFwiZGVzY3JpcHRpb25cIjogXCJaZXRhZm9yZ2UgQ2xpZW50XCIsXG4gIFwiYXV0aG9yXCI6IFwiWmV0YW5lIDxpbmZvQHpldGFuZS5jb20+XCIsXG4gIFwibGljZW5zZVwiOiBcIkFHUEwtMy4wLW9ubHlcIixcbiAgXCJwcml2YXRlXCI6IHRydWUsXG4gIFwiZGVidWdcIjoge1xuICAgIFwiZW52XCI6IHtcbiAgICAgIFwiVklURV9ERVZfU0VSVkVSX1VSTFwiOiBcImh0dHA6Ly8xMjcuMC4wLjE6Nzc3Ny9cIlxuICAgIH1cbiAgfSxcbiAgXCJ0eXBlXCI6IFwibW9kdWxlXCIsXG4gIFwic2NyaXB0c1wiOiB7XG4gICAgXCJkZXZcIjogXCJ2aXRlXCIsXG4gICAgXCJidWlsZFwiOiBcInRzYyAmJiB2aXRlIGJ1aWxkICYmIGVsZWN0cm9uLWJ1aWxkZXJcIixcbiAgICBcInByZXZpZXdcIjogXCJ2aXRlIHByZXZpZXdcIixcbiAgICBcInByZWUyZVwiOiBcInZpdGUgYnVpbGQgLS1tb2RlPXRlc3RcIixcbiAgICBcImUyZVwiOiBcInBsYXl3cmlnaHQgdGVzdFwiLFxuICAgIFwibGludFwiOiBcIm5leHQgbGludFwiLFxuICAgIFwiZm9ybWF0XCI6IFwicHJldHRpZXIgLS1jaGVjayAuXCJcbiAgfSxcbiAgXCJkZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiQGNhcmJvbi9jb2xvcnNcIjogXCJeMTEuMjAuMFwiLFxuICAgIFwiQGNhcmJvbi9yZWFjdFwiOiBcIl4xLjQyLjBcIixcbiAgICBcIkBjYXJib24vc3R5bGVzXCI6IFwiXjEuNDIuMFwiLFxuICAgIFwiQGNhcmJvbi90aGVtZXNcIjogXCJeMTEuMjcuMFwiLFxuICAgIFwiQGNvZGVtaXJyb3Ivdmlld1wiOiBcIl42LjIzLjBcIixcbiAgICBcIkBmb3J0YXdlc29tZS9mb250YXdlc29tZS1mcmVlXCI6IFwiXjYuNS4xXCIsXG4gICAgXCJAZm9ydGF3ZXNvbWUvZm9udGF3ZXNvbWUtc3ZnLWNvcmVcIjogXCJeNi41LjFcIixcbiAgICBcIkB0YW5zdGFjay9yZWFjdC1xdWVyeVwiOiBcIl40LjM2LjFcIixcbiAgICBcIkB0cnBjL3JlYWN0LXF1ZXJ5XCI6IFwiXjEwLjQ1LjFcIixcbiAgICBcIkB1aXcvY29kZW1pcnJvci1leHRlbnNpb25zLWxhbmdzXCI6IFwiXjQuMjEuMjFcIixcbiAgICBcIkB1aXcvY29kZW1pcnJvci10aGVtZS12c2NvZGVcIjogXCJeNC4yMS4yMVwiLFxuICAgIFwiQHVpdy9yZWFjdC1jb2RlbWlycm9yXCI6IFwiXjQuMjEuMjFcIixcbiAgICBcImFqYXhcIjogXCJeMC4wLjRcIixcbiAgICBcImF4aW9zXCI6IFwiXjEuNi43XCIsXG4gICAgXCJib2R5LXBhcnNlclwiOiBcIl4xLjIwLjJcIixcbiAgICBcImNvbXByZXNzaW9uXCI6IFwiXjEuNy40XCIsXG4gICAgXCJjb3JzXCI6IFwiXjIuOC41XCIsXG4gICAgXCJkb3RlbnZcIjogXCJeMTYuMy4xXCIsXG4gICAgXCJlbGVjdHJvbi10cnBjXCI6IFwiXjAuNS4yXCIsXG4gICAgXCJlbGVjdHJvbi11cGRhdGVyXCI6IFwiXjYuMS4xXCIsXG4gICAgXCJleHByZXNzXCI6IFwiXjQuMTguMlwiLFxuICAgIFwiaW1tZXJcIjogXCJeMTAuMC4zXCIsXG4gICAgXCJpc2JvdFwiOiBcIl40LjQuMFwiLFxuICAgIFwiam90YWlcIjogXCJeMi41LjFcIixcbiAgICBcImpvdGFpLWltbWVyXCI6IFwiXjAuMy4wXCIsXG4gICAgXCJqcXVlcnlcIjogXCJeMy43LjFcIixcbiAgICBcImpzb24tZm9ybWF0dGVyLWpzXCI6IFwiXjIuMy40XCIsXG4gICAgXCJtaWNyb21vZGFsXCI6IFwiXjAuNC4xMFwiLFxuICAgIFwibW9uYWNvLWVkaXRvclwiOiBcIl4wLjQ0LjBcIixcbiAgICBcIm11bHRlclwiOiBcIl4xLjQuNS1sdHMuMVwiLFxuICAgIFwibmFub2lkXCI6IFwiXjUuMC41XCIsXG4gICAgXCJub2RlLWZpbGUtZGlhbG9nXCI6IFwiXjEuMC4zXCIsXG4gICAgXCJvcGVuYWlcIjogXCJeMy4zLjBcIixcbiAgICBcInBnXCI6IFwiXjguMTEuM1wiLFxuICAgIFwiem9kXCI6IFwiXjMuMjIuNFwiXG4gIH0sXG4gIFwiZGV2RGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcIkBwbGF5d3JpZ2h0L3Rlc3RcIjogXCJeMS4zNy4xXCIsXG4gICAgXCJAdHlwZXMvcmVhY3RcIjogXCJeMTguMi4yMFwiLFxuICAgIFwiQHR5cGVzL3JlYWN0LWRvbVwiOiBcIl4xOC4yLjdcIixcbiAgICBcIkB2aXRlanMvcGx1Z2luLXJlYWN0XCI6IFwiXjQuMC40XCIsXG4gICAgXCJhdXRvcHJlZml4ZXJcIjogXCJeMTAuNC4xNlwiLFxuICAgIFwiZWxlY3Ryb25cIjogXCJeMjguMS4wXCIsXG4gICAgXCJlbGVjdHJvbi1idWlsZGVyXCI6IFwiXjI0LjYuM1wiLFxuICAgIFwiZXNsaW50XCI6IFwiXjguNTUuMFwiLFxuICAgIFwiZXNsaW50LWNvbmZpZy1wcmV0dGllclwiOiBcIl45LjEuMFwiLFxuICAgIFwiZXNsaW50LXBsdWdpbi1wcmV0dGllclwiOiBcIl41LjAuMVwiLFxuICAgIFwiZXNsaW50LXBsdWdpbi1yZWFjdFwiOiBcIl43LjMzLjJcIixcbiAgICBcImVzbGludC1wbHVnaW4tcmVhY3QtaG9va3NcIjogXCJeNC42LjBcIixcbiAgICBcImVzbGludC1wbHVnaW4tcmVhY3QtcmVmcmVzaFwiOiBcIl4wLjQuNVwiLFxuICAgIFwicG9zdGNzc1wiOiBcIl44XCIsXG4gICAgXCJwcmV0dGllci1wbHVnaW4tdGFpbHdpbmRjc3NcIjogXCJeMC41LjExXCIsXG4gICAgXCJyZWFjdFwiOiBcIl4xOC4yLjBcIixcbiAgICBcInJlYWN0LWRvbVwiOiBcIl4xOC4yLjBcIixcbiAgICBcInNhc3NcIjogXCJeMS42OS43XCIsXG4gICAgXCJ0YWlsd2luZGNzc1wiOiBcIl4zLjQuMFwiLFxuICAgIFwidHJlZS1raWxsXCI6IFwiXjEuMi4yXCIsXG4gICAgXCJ0eXBlc2NyaXB0XCI6IFwiXjUuMS42XCIsXG4gICAgXCJ2aXRlXCI6IFwiXjUuMC4xMFwiLFxuICAgIFwidml0ZS1wbHVnaW4tZWxlY3Ryb25cIjogXCJeMC4yOC4wXCIsXG4gICAgXCJ2aXRlLXBsdWdpbi1lbGVjdHJvbi1yZW5kZXJlclwiOiBcIl4wLjE0LjVcIlxuICB9XG59XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXlRLFNBQVMsY0FBYztBQUNoUyxPQUFPLFVBQVU7QUFDakIsU0FBUyxvQkFBb0I7QUFDN0IsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sY0FBYzs7O0FDSnJCO0FBQUEsRUFDRSxNQUFRO0FBQUEsRUFDUixTQUFXO0FBQUEsRUFDWCxNQUFRO0FBQUEsRUFDUixhQUFlO0FBQUEsRUFDZixRQUFVO0FBQUEsRUFDVixTQUFXO0FBQUEsRUFDWCxTQUFXO0FBQUEsRUFDWCxPQUFTO0FBQUEsSUFDUCxLQUFPO0FBQUEsTUFDTCxxQkFBdUI7QUFBQSxJQUN6QjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLE1BQVE7QUFBQSxFQUNSLFNBQVc7QUFBQSxJQUNULEtBQU87QUFBQSxJQUNQLE9BQVM7QUFBQSxJQUNULFNBQVc7QUFBQSxJQUNYLFFBQVU7QUFBQSxJQUNWLEtBQU87QUFBQSxJQUNQLE1BQVE7QUFBQSxJQUNSLFFBQVU7QUFBQSxFQUNaO0FBQUEsRUFDQSxjQUFnQjtBQUFBLElBQ2Qsa0JBQWtCO0FBQUEsSUFDbEIsaUJBQWlCO0FBQUEsSUFDakIsa0JBQWtCO0FBQUEsSUFDbEIsa0JBQWtCO0FBQUEsSUFDbEIsb0JBQW9CO0FBQUEsSUFDcEIsaUNBQWlDO0FBQUEsSUFDakMscUNBQXFDO0FBQUEsSUFDckMseUJBQXlCO0FBQUEsSUFDekIscUJBQXFCO0FBQUEsSUFDckIsb0NBQW9DO0FBQUEsSUFDcEMsZ0NBQWdDO0FBQUEsSUFDaEMseUJBQXlCO0FBQUEsSUFDekIsTUFBUTtBQUFBLElBQ1IsT0FBUztBQUFBLElBQ1QsZUFBZTtBQUFBLElBQ2YsYUFBZTtBQUFBLElBQ2YsTUFBUTtBQUFBLElBQ1IsUUFBVTtBQUFBLElBQ1YsaUJBQWlCO0FBQUEsSUFDakIsb0JBQW9CO0FBQUEsSUFDcEIsU0FBVztBQUFBLElBQ1gsT0FBUztBQUFBLElBQ1QsT0FBUztBQUFBLElBQ1QsT0FBUztBQUFBLElBQ1QsZUFBZTtBQUFBLElBQ2YsUUFBVTtBQUFBLElBQ1YscUJBQXFCO0FBQUEsSUFDckIsWUFBYztBQUFBLElBQ2QsaUJBQWlCO0FBQUEsSUFDakIsUUFBVTtBQUFBLElBQ1YsUUFBVTtBQUFBLElBQ1Ysb0JBQW9CO0FBQUEsSUFDcEIsUUFBVTtBQUFBLElBQ1YsSUFBTTtBQUFBLElBQ04sS0FBTztBQUFBLEVBQ1Q7QUFBQSxFQUNBLGlCQUFtQjtBQUFBLElBQ2pCLG9CQUFvQjtBQUFBLElBQ3BCLGdCQUFnQjtBQUFBLElBQ2hCLG9CQUFvQjtBQUFBLElBQ3BCLHdCQUF3QjtBQUFBLElBQ3hCLGNBQWdCO0FBQUEsSUFDaEIsVUFBWTtBQUFBLElBQ1osb0JBQW9CO0FBQUEsSUFDcEIsUUFBVTtBQUFBLElBQ1YsMEJBQTBCO0FBQUEsSUFDMUIsMEJBQTBCO0FBQUEsSUFDMUIsdUJBQXVCO0FBQUEsSUFDdkIsNkJBQTZCO0FBQUEsSUFDN0IsK0JBQStCO0FBQUEsSUFDL0IsU0FBVztBQUFBLElBQ1gsK0JBQStCO0FBQUEsSUFDL0IsT0FBUztBQUFBLElBQ1QsYUFBYTtBQUFBLElBQ2IsTUFBUTtBQUFBLElBQ1IsYUFBZTtBQUFBLElBQ2YsYUFBYTtBQUFBLElBQ2IsWUFBYztBQUFBLElBQ2QsTUFBUTtBQUFBLElBQ1Isd0JBQXdCO0FBQUEsSUFDeEIsaUNBQWlDO0FBQUEsRUFDbkM7QUFDRjs7O0FEdEZBLElBQU0sbUNBQW1DO0FBUXpDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsUUFBUSxNQUFNO0FBQzNDLFNBQU8saUJBQWlCLEVBQUUsV0FBVyxNQUFNLE9BQU8sS0FBSyxDQUFDO0FBRXhELFFBQU0sVUFBVSxZQUFZO0FBQzVCLFFBQU0sVUFBVSxZQUFZO0FBQzVCLFFBQU0sWUFBWSxXQUFXLENBQUMsQ0FBQyxRQUFRLElBQUk7QUFFM0MsU0FBTztBQUFBLElBQ0wsU0FBUztBQUFBLE1BQ1AsT0FBTztBQUFBLFFBQ0wsS0FBSyxLQUFLLEtBQUssa0NBQVcsS0FBSztBQUFBLE1BQ2pDO0FBQUEsSUFDRjtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ04sU0FBUztBQUFBLFFBQ1AsTUFBTTtBQUFBO0FBQUEsVUFFSixPQUFPO0FBQUEsVUFDUCxRQUFRLE1BQU07QUFDWixnQkFBSSxRQUFRLElBQUksY0FBYztBQUM1QixzQkFBUTtBQUFBO0FBQUEsZ0JBQXlDO0FBQUEsY0FBd0I7QUFBQSxZQUMzRSxPQUFPO0FBQ0wsbUJBQUssUUFBUTtBQUFBLFlBQ2Y7QUFBQSxVQUNGO0FBQUEsVUFDQSxNQUFNO0FBQUEsWUFDSixPQUFPO0FBQUEsY0FDTDtBQUFBLGNBQ0EsUUFBUTtBQUFBLGNBQ1IsUUFBUTtBQUFBLGNBQ1IsZUFBZTtBQUFBLGdCQUNiLFVBQVUsT0FBTyxLQUFLLGtCQUFrQixrQkFBTSxnQkFBSSxlQUFlLENBQUMsQ0FBQztBQUFBLGNBQ3JFO0FBQUEsWUFDRjtBQUFBLFVBQ0Y7QUFBQSxRQUNGO0FBQUEsUUFDQSxTQUFTO0FBQUE7QUFBQTtBQUFBLFVBR1AsT0FBTztBQUFBLFVBQ1AsTUFBTTtBQUFBLFlBQ0osT0FBTztBQUFBLGNBQ0wsV0FBVyxZQUFZLFdBQVc7QUFBQTtBQUFBLGNBQ2xDLFFBQVE7QUFBQSxjQUNSLFFBQVE7QUFBQSxjQUNSLGVBQWU7QUFBQSxnQkFDYixVQUFVLE9BQU8sS0FBSyxrQkFBa0Isa0JBQU0sZ0JBQUksZUFBZSxDQUFDLENBQUM7QUFBQSxjQUNyRTtBQUFBLFlBQ0Y7QUFBQSxVQUNGO0FBQUEsUUFDRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFFBSUEsVUFBVSxDQUFDO0FBQUEsTUFDYixDQUFDO0FBQUEsSUFDSDtBQUFBLElBQ0EsUUFBUSxRQUFRLElBQUksaUJBQWlCLE1BQU07QUFDekMsWUFBTSxNQUFNLElBQUksSUFBSSxnQkFBSSxNQUFNLElBQUksbUJBQW1CO0FBQ3JELGFBQU87QUFBQSxRQUNMLE1BQU0sSUFBSTtBQUFBLFFBQ1YsTUFBTSxDQUFDLElBQUk7QUFBQSxNQUNiO0FBQUEsSUFDRixHQUFHO0FBQUEsSUFDSCxhQUFhO0FBQUEsRUFDZjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
