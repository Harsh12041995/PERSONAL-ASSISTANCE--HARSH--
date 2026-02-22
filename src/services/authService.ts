// src/services/authService.ts

import api from "./axiosInstance";

const TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const ROLE_KEY = "userRole";
const PERMISSIONS_KEY = "permissions";
const USER_KEY = "user";
const AUTH_RESPONSE_KEY = "authResponse";
const COMPANY_KEY = "company";
const GROUPS_KEY = "groups";

interface TokenPayload {
  exp: number;
  iat: number;
  sub: string;
  role?: string;
  [key: string]: any;
}

// API Response Types
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

interface SignInPermission {
  _id: string;
  name: string;
  display_name: string;
  description: string;
  module: string;
  action: string;
  isActive: boolean;
}

interface SignInRole {
  _id: string;
  name: string;
  key?: number;
  description?: string;
  permissions: SignInPermission[];
  is_system_role?: boolean;
  isActive?: boolean;
}

interface SignInCompany {
  _id: string;
  name: string;
  code: string;
  companyName?: string;
  email?: string;
  industry?: string;
  status?: string;
  groupId?: {
    _id: string;
    name: string;
    code: string;
    groupName?: string;
  };
}

interface SignInUser {
  _id: string;
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  username?: string;
  phone?: string;
  user_tokens?: unknown;
  department?: string;
  status?: string;
  purpose?: string;
  join_date?: string;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

interface SignInGroups {
  solar_groups: string[];
  solar_groups_ids: string[];
  wind_groups: string[];
  wind_groups_ids: string[];
}

interface SignInResponseData {
  user: SignInUser;
  company: SignInCompany;
  role: SignInRole;
  token: string;
  groups?: SignInGroups;
}

interface PermissionSet {
  [module: string]: string[];
}

interface LegacyTokenPair {
  access: {
    token: string;
    expires?: string;
  };
  refresh?: {
    token: string;
    expires?: string;
  };
}

interface LoginResponse {
  user: any;
  token: string;
  company: SignInCompany;
  role: SignInRole;
  permissions: PermissionSet;
}

interface RegisterRequest {
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  password: string;
  phone?: string;
  department?: string;
  purpose?: string;
}

interface LoginRequest {
  email?: string;
  mobile?: string;
  password: string;
}

// Interfaces kept for future use
// interface ForgotPasswordRequest {
//   email: string;
// }

// interface ResetPasswordRequest {
//   token: string;
//   password: string;
// }

// interface SetPasswordRequest {
//   token: string;
//   password: string;
// }

export const authService = {
  /**
   * Login user with backend API
   */
  loginUser: async (credentials: LoginRequest): Promise<LoginResponse> => {
    try {
      const response = await api.post<ApiResponse<SignInResponseData>>(
        "/auth/sign-in",
        credentials
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Login failed");
      }

      const responseData = response.data.data;

      if (!responseData?.token) {
        throw new Error("Login failed: missing authentication token");
      }

      const normalizedUser: any = {
        ...responseData.user,
        id: responseData.user._id,
        company: responseData.company,
        role: responseData.role,
      };

      const permissions = mapPermissions(responseData.role?.permissions || []);
      const roleName = responseData.role?.name
        ? responseData.role.name.toLowerCase()
        : "";

      // Store raw auth response for future use
      localStorage.setItem(AUTH_RESPONSE_KEY, JSON.stringify(responseData));
      
      // Store groups data if available
      if (responseData.groups) {
        localStorage.setItem(GROUPS_KEY, JSON.stringify(responseData.groups));
      }
      localStorage.setItem(COMPANY_KEY, JSON.stringify(responseData.company));

      // Store authentication data
      authService.login(
        responseData.token,
        null,
        roleName,
        permissions,
        normalizedUser
      );

      return {
        user: normalizedUser,
        token: responseData.token,
        company: responseData.company,
        role: responseData.role,
        permissions,
      };
    } catch (error: any) {
      console.error("Login error:", error);
      throw new Error(error.message || "Login failed");
    }
  },

  /**
   * Register new user with backend API
   */
  registerUser: async (
    userData: RegisterRequest
  ): Promise<{ message: string; data?: any }> => {
    try {
      const response = await api.post<ApiResponse<any>>(
        "/auth/sign-up",
        userData
      );

      // Some APIs may not include the standard wrapper, so handle both cases
      if (response.data) {
        const { success, message, data } = response.data as ApiResponse<any>;

        if (typeof success !== "undefined" && !success) {
          throw new Error(message || "Registration failed");
        }

        return {
          message: message || "Account created successfully",
          data,
        };
      }

      return {
        message: "Account created successfully",
        data: response.data,
      };
    } catch (error: any) {
      console.error("Registration error:", error);
      throw new Error(error.message || "Registration failed");
    }
  },

  /**
   * Logout user with backend API
   */
  logoutUser: async (): Promise<void> => {
    try {
      const refreshToken = authService.getRefreshToken();
      if (refreshToken) {
        await api.post("/auth/logout", { refreshToken });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      authService.logout();
    }
  },

  /**
   * Forgot password request
   */
  forgotPassword: async (email: string): Promise<void> => {
    try {
      const response = await api.post<ApiResponse<null>>(
        "/auth/forgot-password",
        { email }
      );

      // Handle 204 No Content response (success with no body)
      if (response.status === 204) {
        return;
      }

      // Handle response with data
      if (response.data && !response.data.success) {
        throw new Error(response.data.message || "Failed to send reset email");
      }
    } catch (error: any) {
      console.error("Forgot password error:", error);

      // If it's a 204 status, it's actually success
      if (error?.response?.status === 204) {
        return;
      }

      throw new Error(error.message || "Failed to send reset email");
    }
  },

  /**
   * Reset password with token
   */
  resetPassword: async (token: string, password: string): Promise<void> => {
    try {
      const response = await api.post<ApiResponse<null>>(
        "/auth/reset-password",
        {
          token,
          password,
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to reset password");
      }
    } catch (error: any) {
      console.error("Reset password error:", error);
      throw new Error(error.message || "Failed to reset password");
    }
  },

  /**
   * Set password with token (for new users)
   */
  setPassword: async (token: string, password: string): Promise<void> => {
    try {
      const response = await api.post<ApiResponse<null>>("/auth/set-password", {
        token,
        password,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to set password");
      }
    } catch (error: any) {
      console.error("Set password error:", error);
      throw new Error(error.message || "Failed to set password");
    }
  },

  /**
   * Send email verification
   */
  sendVerificationEmail: async (): Promise<void> => {
    try {
      const response = await api.post<ApiResponse<null>>(
        "/auth/send-verification-email"
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Failed to send verification email"
        );
      }
    } catch (error: any) {
      console.error("Send verification email error:", error);
      throw new Error(error.message || "Failed to send verification email");
    }
  },

  /**
   * Verify email with token
   */
  verifyEmail: async (token: string): Promise<void> => {
    try {
      const response = await api.post<ApiResponse<null>>("/auth/verify-email", {
        token,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to verify email");
      }
    } catch (error: any) {
      console.error("Verify email error:", error);
      throw new Error(error.message || "Failed to verify email");
    }
  },

  /**
   * Send OTP to mobile
   */
  sendOtp: async (mobile: string): Promise<void> => {
    try {
      const response = await api.post<ApiResponse<null>>("/auth/send-otp", {
        mobile,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to send OTP");
      }
    } catch (error: any) {
      console.error("Send OTP error:", error);
      throw new Error(error.message || "Failed to send OTP");
    }
  },

  /**
   * Login with OTP
   */
  loginWithOtp: async (mobile: string, otp: string): Promise<LoginResponse> => {
    try {
      const response = await api.post<ApiResponse<SignInResponseData>>(
        "/auth/login-with-otp",
        {
          mobile,
          otp,
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "OTP login failed");
      }

      const responseData = response.data.data;

      if (!responseData?.token) {
        throw new Error("OTP login failed: missing authentication token");
      }

      const normalizedUser: any = {
        ...responseData.user,
        id: responseData.user._id,
        company: responseData.company,
        role: responseData.role,
      };

      const permissions = mapPermissions(responseData.role?.permissions || []);
      const roleName = responseData.role?.name
        ? responseData.role.name.toLowerCase()
        : "";

      localStorage.setItem(AUTH_RESPONSE_KEY, JSON.stringify(responseData));
      localStorage.setItem(COMPANY_KEY, JSON.stringify(responseData.company));
      
      // Store groups data if available
      if (responseData.groups) {
        localStorage.setItem(GROUPS_KEY, JSON.stringify(responseData.groups));
      }

      // Store authentication data
      authService.login(
        responseData.token,
        null,
        roleName,
        permissions,
        normalizedUser
      );

      return {
        user: normalizedUser,
        token: responseData.token,
        company: responseData.company,
        role: responseData.role,
        permissions,
      };
    } catch (error: any) {
      console.error("OTP login error:", error);
      throw new Error(error.message || "OTP login failed");
    }
  },

  /**
   * Login and store tokens
   */
  login: (
    accessToken: string,
    refreshToken: string | null,
    role: string,
    permissions: any,
    user: any
  ) => {
    console.log("AuthService - Login called with:", {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      role,
      hasPermissions: !!permissions,
      hasUser: !!user,
    });

    authService.setToken(accessToken);
    if (refreshToken) {
      authService.setRefreshToken(refreshToken);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
    if (role) {
      authService.setRole(role);
    } else {
      localStorage.removeItem(ROLE_KEY);
    }
    if (permissions && Object.keys(permissions).length > 0) {
      authService.setPermissions(permissions);
    } else {
      localStorage.removeItem(PERMISSIONS_KEY);
    }
    authService.setUser(user);
    if (user?.company) {
      authService.setCompany(user.company);
    }

    console.log("AuthService - Tokens stored successfully");
  },

  /**
   * Logout and clear all stored data
   */
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(PERMISSIONS_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(AUTH_RESPONSE_KEY);
    localStorage.removeItem(COMPANY_KEY);
    localStorage.removeItem(GROUPS_KEY);
    localStorage.removeItem("ams_dashboard_view"); // Clear dashboard view preference
  },

  /**
   * Get access token
   */
  getToken: (): string | null => {
    const token = localStorage.getItem(TOKEN_KEY);
    console.log(
      "AuthService - getToken called, token:",
      token ? "Present" : "Missing"
    );
    return token;
  },

  /**
   * Set access token
   */
  setToken: (token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
  },

  /**
   * Get refresh token
   */
  getRefreshToken: (): string | null => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  /**
   * Set refresh token
   */
  setRefreshToken: (token: string) => {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },

  /**
   * Get user role
   */
  getRole: (): string | null => {
    return localStorage.getItem(ROLE_KEY);
  },

  /**
   * Set user role
   */
  setRole: (role: string) => {
    localStorage.setItem(ROLE_KEY, role);
  },

  /**
   * Get user permissions
   */
  getPermissions: (): any => {
    const permissions = localStorage.getItem(PERMISSIONS_KEY);
    return permissions ? JSON.parse(permissions) : null;
  },

  /**
   * Set user permissions
   */
  setPermissions: (permissions: any) => {
    localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(permissions));
  },

  /**
   * Get user data
   */
  getUser: (): any => {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  /**
   * Set user data
   */
  setUser: (user: any) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  /**
   * Get company data
   */
  getCompany: (): SignInCompany | null => {
    const company = localStorage.getItem(COMPANY_KEY);
    return company ? JSON.parse(company) : null;
  },

  /**
   * Set company data
   */
  setCompany: (company: SignInCompany) => {
    localStorage.setItem(COMPANY_KEY, JSON.stringify(company));
  },

  /**
   * Get groups data
   */
  getGroups: (): SignInGroups | null => {
    const groups = localStorage.getItem(GROUPS_KEY);
    return groups ? JSON.parse(groups) : null;
  },

  /**
   * Set groups data
   */
  setGroups: (groups: SignInGroups) => {
    localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: (): boolean => {
    const token = authService.getToken();
    const isExpired = authService.isTokenExpired();
    const hasRefreshToken = authService.hasRefreshToken();

    console.log("AuthService - isAuthenticated check:", {
      hasToken: !!token,
      isExpired,
      hasRefreshToken,
      result: !!token && !isExpired,
    });

    return !!token && !isExpired;
  },

  /**
   * Check if token is expired
   */
  isTokenExpired: (): boolean => {
    const token = authService.getToken();
    if (!token) {
      console.log("AuthService - isTokenExpired: No token found");
      return true;
    }

    try {
      const payload = authService.decodeToken(token);
      const currentTime = Math.floor(Date.now() / 1000);
      const isExpired = payload.exp < currentTime;
      console.log("AuthService - isTokenExpired:", {
        tokenExp: payload.exp,
        currentTime,
        isExpired,
        timeUntilExpiry: payload.exp - currentTime,
      });
      return isExpired;
    } catch (error) {
      console.error("AuthService - Error decoding token:", error);
      return true;
    }
  },

  /**
   * Check if token will expire soon (within 5 minutes)
   */
  isTokenExpiringSoon: (): boolean => {
    const token = authService.getToken();
    if (!token) return true;

    try {
      const payload = authService.decodeToken(token);
      const currentTime = Math.floor(Date.now() / 1000);
      const fiveMinutes = 5 * 60; // 5 minutes in seconds
      const willExpireSoon = payload.exp < currentTime + fiveMinutes;

      console.log("AuthService - isTokenExpiringSoon:", {
        tokenExp: payload.exp,
        currentTime,
        fiveMinutesFromNow: currentTime + fiveMinutes,
        willExpireSoon,
      });

      return willExpireSoon;
    } catch (error) {
      console.error("Error decoding token:", error);
      return true;
    }
  },

  /**
   * Decode JWT token
   */
  decodeToken: (token: string): TokenPayload => {
    try {
      console.log(
        "AuthService - decodeToken called with token length:",
        token.length
      );

      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map(function (c) {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join("")
      );

      const payload = JSON.parse(jsonPayload);
      console.log("AuthService - decodeToken successful, payload:", {
        sub: payload.sub,
        type: payload.type,
        exp: payload.exp,
        iat: payload.iat,
      });

      return payload;
    } catch (error) {
      console.error("AuthService - decodeToken error:", error);
      throw new Error("Invalid token format");
    }
  },

  /**
   * Get token payload
   */
  getTokenPayload: (): TokenPayload | null => {
    const token = authService.getToken();
    if (!token) return null;

    try {
      return authService.decodeToken(token);
    } catch (error) {
      return null;
    }
  },

  /**
   * Refresh access token using refresh token
   */
  refreshToken: async (): Promise<boolean> => {
    const refreshToken = authService.getRefreshToken();
    if (!refreshToken) {
      console.error("No refresh token available");
      return false;
    }

    try {
      const response = await api.post<
        ApiResponse<{ tokens: LegacyTokenPair }>
      >("/auth/refresh-tokens", {
        refreshToken,
      });

      if (response.data.success) {
        const { tokens } = response.data.data;
        authService.setToken(tokens.access.token);
        if (tokens.refresh) {
          authService.setRefreshToken(tokens.refresh.token);
        }
        return true;
      } else {
        console.error("Token refresh failed");
        authService.logout();
        return false;
      }
    } catch (error) {
      console.error("Error refreshing token:", error);
      authService.logout();
      return false;
    }
  },

  /**
   * Get all stored auth data
   */
  getAuthData: () => {
    return {
      token: authService.getToken(),
      refreshToken: authService.getRefreshToken(),
      role: authService.getRole(),
      permissions: authService.getPermissions(),
      user: authService.getUser(),
      company: authService.getCompany(),
      groups: authService.getGroups(),
    };
  },

  /**
   * Set all auth data at once
   */
  setAuthData: (data: {
    token: string;
    refreshToken?: string | null;
    role: string;
    permissions: any;
    user: any;
    company?: SignInCompany | null;
    groups?: SignInGroups | null;
  }) => {
    authService.setToken(data.token);
    if (data.refreshToken) {
      authService.setRefreshToken(data.refreshToken);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
    authService.setRole(data.role);
    authService.setPermissions(data.permissions);
    authService.setUser(data.user);
    if (data.company) {
      authService.setCompany(data.company);
    }
    if (data.groups) {
      authService.setGroups(data.groups);
    }
  },

  /**
   * Clear all auth data
   */
  clearAuth: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(PERMISSIONS_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(AUTH_RESPONSE_KEY);
    localStorage.removeItem(COMPANY_KEY);
    localStorage.removeItem(GROUPS_KEY);
    localStorage.removeItem("ams_dashboard_view"); // Clear dashboard view preference
  },

  /**
   * Check if refresh token is available
   */
  hasRefreshToken: (): boolean => {
    return !!authService.getRefreshToken();
  },

  /**
   * Get token expiration time
   */
  getTokenExpiration: (): Date | null => {
    const payload = authService.getTokenPayload();
    return payload ? new Date(payload.exp * 1000) : null;
  },

  /**
   * Get time until token expires (in seconds)
   */
  getTimeUntilExpiration: (): number => {
    const payload = authService.getTokenPayload();
    if (!payload) return 0;

    const currentTime = Math.floor(Date.now() / 1000);
    return Math.max(0, payload.exp - currentTime);
  },

  /**
   * Check session health and provide detailed status
   */
  checkSessionHealth: () => {
    const token = authService.getToken();
    const refreshToken = authService.getRefreshToken();
    const role = authService.getRole();
    const permissions = authService.getPermissions();
    const user = authService.getUser();

    let tokenStatus = "none";
    let refreshTokenStatus = "none";
    let sessionStatus = "invalid";

    if (token) {
      try {
        const payload = authService.decodeToken(token);
        const currentTime = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = payload.exp - currentTime;

        if (payload.exp < currentTime) {
          tokenStatus = "expired";
        } else if (timeUntilExpiry < 300) {
          // 5 minutes
          tokenStatus = "expiring_soon";
        } else {
          tokenStatus = "valid";
        }
      } catch (error) {
        tokenStatus = "invalid_format";
      }
    }

    if (refreshToken) {
      refreshTokenStatus = "present";
    }

    if (tokenStatus === "valid" && refreshTokenStatus === "present") {
      sessionStatus = "healthy";
    } else if (tokenStatus === "expired" && refreshTokenStatus === "present") {
      sessionStatus = "needs_refresh";
    } else if (
      tokenStatus === "expiring_soon" &&
      refreshTokenStatus === "present"
    ) {
      sessionStatus = "should_refresh";
    } else {
      sessionStatus = "unhealthy";
    }

    const healthReport = {
      sessionStatus,
      tokenStatus,
      refreshTokenStatus,
      hasRole: !!role,
      hasPermissions: !!permissions,
      hasUser: !!user,
      timestamp: new Date().toISOString(),
      localStorage: {
        token: !!localStorage.getItem(TOKEN_KEY),
        refreshToken: !!localStorage.getItem(REFRESH_TOKEN_KEY),
        role: !!localStorage.getItem(ROLE_KEY),
        permissions: !!localStorage.getItem(PERMISSIONS_KEY),
        user: !!localStorage.getItem(USER_KEY),
      },
    };

    console.log("AuthService - Session Health Check:", healthReport);
    return healthReport;
  },
};

const mapPermissions = (permissions: SignInPermission[]): PermissionSet => {
  return permissions.reduce<PermissionSet>((acc, permission) => {
    if (!permission?.module || !permission?.action) {
      return acc;
    }

    const moduleKey = permission.module.toLowerCase();
    const action = permission.action.toLowerCase();

    if (!acc[moduleKey]) {
      acc[moduleKey] = [];
    }

    if (!acc[moduleKey].includes(action)) {
      acc[moduleKey].push(action);
    }

    return acc;
  }, {});
};
