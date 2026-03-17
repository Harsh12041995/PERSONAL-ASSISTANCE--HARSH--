// Environment Configuration Utility
// This file automatically detects the environment and sets appropriate configuration

interface EnvironmentConfig {
  env: string;
  apiBaseUrl: string;
  appTitle: string;
  debug: boolean;
  isLocal: boolean;
  isDev: boolean;
  isStaging: boolean;
  isProduction: boolean;
}

// Detect environment based on various factors
const detectEnvironment = (): string => {
  // Check for explicit environment variable
  const explicitEnv = import.meta.env.VITE_ENV;
  if (explicitEnv) return explicitEnv;

  // Check for NODE_ENV
  const nodeEnv = import.meta.env.MODE;

  // Check if running on localhost
  const isLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.includes("localhost"));

  // Check if running on development port
  const isDevPort =
    typeof window !== "undefined" &&
    (window.location.port === "5173" || window.location.port === "3000");

  // Determine environment
  if (isLocalhost || isDevPort || nodeEnv === "dev-local") {
    return "local";
  }

  if (nodeEnv === "development") {
    return "development";
  }

  if (nodeEnv === "production") {
    return "production";
  }

  // Default to local for safety
  return "local";
};

// Get environment-specific configuration
const getEnvironmentConfig = (): EnvironmentConfig => {
  const env = detectEnvironment();

  // Get values from environment variables with fallbacks
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || getDefaultApiUrl(env);
  const appTitle = import.meta.env.VITE_APP_TITLE || getDefaultAppTitle(env);
  const debug =
    import.meta.env.VITE_DEBUG === "true" || isDevelopmentEnvironment(env);

  return {
    env,
    apiBaseUrl,
    appTitle,
    debug,
    isLocal: env === "local",
    isDev: env === "development",
    isStaging: env === "staging",
    isProduction: env === "production",
  };
};

// Helper functions to get default values
const getDefaultApiUrl = (env: string): string => {
  switch (env) {
    case "local":
      return "http://localhost:3000/api";
    case "development":
      return "https://dev-api.yourdomain.com/api";
    case "staging":
      return "https://staging-api.yourdomain.com/api";
    case "production":
      return "https://api.yourdomain.com/api";
    default:
      return "/api";
  }
};

const getDefaultAppTitle = (env: string): string => {
  switch (env) {
    case "local":
      return "Personal Portal (Local)";
    case "development":
      return "Personal Portal (Development)";
    case "staging":
      return "Personal Portal (Staging)";
    case "production":
      return "Personal Portal";
    default:
      return "Personal Portal (Local)";
  }
};

const isDevelopmentEnvironment = (env: string): boolean => {
  return env === "local" || env === "development";
};

// Export the configuration
export const environment = getEnvironmentConfig();

// Export individual values for convenience
export const {
  apiBaseUrl,
  appTitle,
  debug,
  isLocal,
  isDev,
  isStaging,
  isProduction,
} = environment;

// Log environment information in development
if (debug) {
  console.log("🌍 Environment Configuration:", {
    environment: environment.env,
    apiBaseUrl,
    appTitle,
    debug,
    hostname:
      typeof window !== "undefined" ? window.location.hostname : "server",
    port: typeof window !== "undefined" ? window.location.port : "server",
  });
}

export default environment;
