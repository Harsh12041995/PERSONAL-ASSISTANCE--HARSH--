import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { authService } from "../services/authService";
import {
  setLoginTimestamp,
  clearLoginTimestamp,
  clearAllApiCaches,
} from "../utils/cacheUtils";

interface PermissionSet {
  [key: string]: string[];
}

interface GroupsData {
  solar_groups: string[];
  solar_groups_ids: string[];
  wind_groups: string[];
  wind_groups_ids: string[];
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  role: string | null;
  permissions: PermissionSet | null;
  user: any | null;
  groups: GroupsData | null;
  isLoading: boolean;
  isInitialized: boolean;
}

interface AuthContextType extends AuthState {
  login: (
    accessToken: string,
    refreshToken: string | null,
    role: string,
    permissions: PermissionSet,
    user: any
  ) => void;
  logout: () => void;
  hasPermission: (module: string, action: string) => boolean;
  hasFeatureAccess: (permissionId: string) => boolean;
  refreshAuth: () => Promise<boolean>;
  isTokenExpired: () => boolean;
  isTokenExpiringSoon: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    refreshToken: null,
    role: null,
    permissions: null,
    user: null,
    groups: null,
    isLoading: true,
    isInitialized: false,
  });

  // Initialize auth state from localStorage with proper loading states
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setState((prev) => ({ ...prev, isLoading: true }));

        const token = authService.getToken();
        const refreshToken = authService.getRefreshToken();
        const role = authService.getRole();
        const permissions = authService.getPermissions();
        const user = authService.getUser();
        const groups = authService.getGroups();

        if (token && !authService.isTokenExpired()) {
          // Token is valid, set auth state
          setState({
            token,
            refreshToken,
            role,
            permissions,
            user,
            groups,
            isLoading: false,
            isInitialized: true,
          });
        } else if (token && authService.isTokenExpired() && refreshToken) {
          // Token expired but refresh token exists, try to refresh
          try {
            const success = await authService.refreshToken();
            if (success) {
              // Update state with new token data
              const newToken = authService.getToken();
              const newRefreshToken = authService.getRefreshToken();
              const newRole = authService.getRole();
              const newPermissions = authService.getPermissions();
              const newUser = authService.getUser();
              const newGroups = authService.getGroups();

              setState({
                token: newToken,
                refreshToken: newRefreshToken,
                role: newRole,
                permissions: newPermissions,
                user: newUser,
                groups: newGroups,
                isLoading: false,
                isInitialized: true,
              });
            } else {
              // Refresh failed, clear state
              setState({
                token: null,
                refreshToken: null,
                role: null,
                permissions: null,
                user: null,
                groups: null,
                isLoading: false,
                isInitialized: true,
              });
            }
          } catch (error) {
            console.error(
              "Error refreshing token during initialization:",
              error
            );
            setState({
              token: null,
              refreshToken: null,
              role: null,
              permissions: null,
              user: null,
              groups: null,
              isLoading: false,
              isInitialized: true,
            });
          }
        } else {
          // No valid token or refresh token
          setState({
            token: null,
            refreshToken: null,
            role: null,
            permissions: null,
            user: null,
            groups: null,
            isLoading: false,
            isInitialized: true,
          });
        }
      } catch (error) {
        console.error("Error during auth initialization:", error);
        setState({
          token: null,
          refreshToken: null,
          role: null,
          permissions: null,
          user: null,
          groups: null,
          isLoading: false,
          isInitialized: true,
        });
      }
    };

    initializeAuth();
  }, []);

  // Set up token refresh interval only after initialization
  useEffect(() => {
    if (!state.isInitialized || !state.token) return;

    const checkTokenExpiration = async () => {
      if (authService.isTokenExpiringSoon() && state.refreshToken) {
        await refreshAuth();
      }
    };

    // Check every minute
    const interval = setInterval(checkTokenExpiration, 60000);
    return () => clearInterval(interval);
  }, [state.isInitialized, state.token, state.refreshToken]);

  const login = (
    accessToken: string,
    refreshToken: string | null,
    role: string,
    permissions: PermissionSet,
    user: any
  ) => {
    // Store in authService
    authService.login(accessToken, refreshToken, role, permissions, user);

    // Set login timestamp for cache management
    setLoginTimestamp(user.id || user._id || "unknown");

    // Get groups data from authService
    const groups = authService.getGroups();

    // Update state
    setState((prev) => ({
      ...prev,
      token: accessToken,
      refreshToken: refreshToken ?? null,
      role,
      permissions,
      user,
      groups,
      isLoading: false,
    }));
  };

  const logout = () => {
    authService.logout();

    // Clear all API caches and login timestamp
    clearAllApiCaches();
    clearLoginTimestamp();

    setState((prev) => ({
      ...prev,
      token: null,
      refreshToken: null,
      role: null,
      permissions: null,
      user: null,
      groups: null,
      isLoading: false,
    }));
  };

  const refreshAuth = async (): Promise<boolean> => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      const success = await authService.refreshToken();
      if (success) {
        // Update state with new token data
        const newToken = authService.getToken();
        const newRefreshToken = authService.getRefreshToken();
        const role = authService.getRole();
        const permissions = authService.getPermissions();
        const user = authService.getUser();
        const groups = authService.getGroups();

        setState((prev) => ({
          ...prev,
          token: newToken,
          refreshToken: newRefreshToken,
          role,
          permissions,
          user,
          groups,
          isLoading: false,
        }));
        return true;
      } else {
        // Refresh failed, logout user
        logout();
        return false;
      }
    } catch (error) {
      console.error("Error refreshing auth:", error);
      logout();
      return false;
    }
  };

  const hasPermission = (module: string, action: string): boolean => {
    if (!state.permissions) {
      return false;
    }

    // Admin override - admin should have all permissions
    if (state.role?.toLowerCase() === "admin") {
      return true;
    }

    const modulePermissions = state.permissions[module];
    return modulePermissions?.includes(action) || false;
  };

  const hasFeatureAccess = (permissionId: string): boolean => {
    if (!permissionId) return true;
    const roleName = state.role?.toLowerCase();
    if (roleName === "owner" || roleName === "admin") return true;

    const directPermissions: string[] = Array.isArray(state.user?.permissions)
      ? state.user.permissions
      : [];
    if (directPermissions.includes(permissionId)) return true;

    if (state.permissions) {
      return Object.keys(state.permissions).some((moduleKey) => {
        if (moduleKey === permissionId) return true;
        const actions = state.permissions?.[moduleKey] || [];
        return actions.includes(permissionId);
      });
    }

    return false;
  };

  const isTokenExpired = (): boolean => {
    return authService.isTokenExpired();
  };

  const isTokenExpiringSoon = (): boolean => {
    return authService.isTokenExpiringSoon();
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        hasPermission,
        hasFeatureAccess,
        refreshAuth,
        isTokenExpired,
        isTokenExpiringSoon,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
