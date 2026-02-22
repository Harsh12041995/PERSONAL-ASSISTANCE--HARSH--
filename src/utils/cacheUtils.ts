/**
 * Cache utility functions for managing API cache with login timestamps
 */

const LOGIN_TIMESTAMP_KEY = "userLoginTimestamp";
const USER_ID_KEY = "currentUserId";

/**
 * Set login timestamp when user logs in
 */
export const setLoginTimestamp = (userId: string): void => {
  const timestamp = Date.now();
  sessionStorage.setItem(LOGIN_TIMESTAMP_KEY, timestamp.toString());
  sessionStorage.setItem(USER_ID_KEY, userId);
  console.log(
    `🔐 Login timestamp set for user ${userId}:`,
    new Date(timestamp).toLocaleTimeString()
  );
};

/**
 * Get login timestamp
 */
export const getLoginTimestamp = (): number | null => {
  const timestamp = sessionStorage.getItem(LOGIN_TIMESTAMP_KEY);
  return timestamp ? parseInt(timestamp, 10) : null;
};

/**
 * Get current user ID
 */
export const getCurrentUserId = (): string | null => {
  return sessionStorage.getItem(USER_ID_KEY);
};

/**
 * Clear login timestamp (on logout)
 */
export const clearLoginTimestamp = (): void => {
  sessionStorage.removeItem(LOGIN_TIMESTAMP_KEY);
  sessionStorage.removeItem(USER_ID_KEY);
  console.log("🔐 Login timestamp cleared");
};

/**
 * Clear all API caches for current user
 */
export const clearAllApiCaches = (): void => {
  const userId = getCurrentUserId();
  if (!userId) return;

  try {
    // Get all session storage keys
    const keys = Object.keys(sessionStorage);

    // Clear all API cache keys for current user
    keys.forEach((key) => {
      if (key.startsWith("apiCache_") && key.includes(`_${userId}`)) {
        sessionStorage.removeItem(key);
        console.log(`🗑️ Cleared cache: ${key}`);
      }
    });

    console.log("🗑️ All API caches cleared for user:", userId);
  } catch (error) {
    console.warn("Failed to clear API caches:", error);
  }
};

/**
 * Check if cache should be refreshed based on login time
 */
export const shouldRefreshCache = (
  lastFetchTime: number | null,
  loginTimestamp: number | null
): boolean => {
  if (!lastFetchTime || !loginTimestamp) return true;

  // If last fetch was before login, refresh
  return lastFetchTime < loginTimestamp;
};
