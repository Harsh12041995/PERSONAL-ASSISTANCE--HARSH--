import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), "");

  // Determine the environment
  const isDevelopment = mode === "development";
  // isProduction variable kept for future use
  // const isProduction = mode === 'production'; // Kept for future use
  const isLocal =
    env.VITE_ENV === "local" ||
    mode === "dev-local" ||
    (!env.VITE_ENV && isDevelopment);
  const isDev = env.VITE_ENV === "dev" || env.VITE_ENV === "development";
  const isStaging = env.VITE_ENV === "staging";

  // Set environment-specific variables with fallbacks
  const envConfig = {
    VITE_ENV: mode,
    VITE_API_BASE_URL:
      env.VITE_API_BASE_URL ||
      (isLocal
        ? "/api"
        : isDev
          ? "https://dev-api.yourdomain.com/api"
          : isStaging
            ? "https://staging-api.yourdomain.com/api"
            : "https://api.yourdomain.com/api"),
    VITE_APP_TITLE:
      env.VITE_APP_TITLE ||
      (isLocal
        ? "AMS Portal (Local)"
        : isDev
          ? "AMS Portal (Development)"
          : isStaging
            ? "AMS Portal (Staging)"
            : "AMS Portal"),
    VITE_DEBUG: env.VITE_DEBUG || (isLocal || isDev ? "true" : "false"),
  };

  console.log("🚀 Environment Configuration:");
  console.log("Mode:", mode);
  console.log("Environment:", envConfig.VITE_ENV);
  console.log("API Base URL:", envConfig.VITE_API_BASE_URL);
  console.log("App Title:", envConfig.VITE_APP_TITLE);
  console.log("Debug Mode:", envConfig.VITE_DEBUG);

  return {
    plugins: [
      react(),
      svgr({
        svgrOptions: {
          icon: true,
          // This will transform your SVG to a React component
          exportType: "named",
          namedExport: "ReactComponent",
        },
      }),
    ],
    define: {
      // Make environment variables available to the client
      "process.env": envConfig,
      // Also define them as import.meta.env for Vite compatibility
      "import.meta.env.VITE_ENV": JSON.stringify(envConfig.VITE_ENV),
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(
        envConfig.VITE_API_BASE_URL
      ),
      "import.meta.env.VITE_APP_TITLE": JSON.stringify(
        envConfig.VITE_APP_TITLE
      ),
      "import.meta.env.VITE_DEBUG": JSON.stringify(envConfig.VITE_DEBUG),
    },
    server: {
      port: 5173,
      host: true,
      // Proxy API requests to backend in development
      proxy: {
        "/api": {
          target: "http://localhost:5001/api/v1",
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },

    build: {
      outDir: "dist",
      sourcemap: isLocal || isDev,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom"],
            router: ["react-router-dom"],
            ui: ["lucide-react"],
          },
        },
      },
    },
  };
});
