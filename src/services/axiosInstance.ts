// src/services/axiosInstance.ts

import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestHeaders,
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosRequestConfig,
} from "axios";
import { authService } from "./authService";
import { apiBaseUrl } from "../config/environment";

interface FailedQueueItem {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

// Standard API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  code?: number;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export interface PaginatedApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T[];
  meta: {
    page: number;
    limit: number;
    totalPages: number;
    totalDocs: number;
    hasPrevPage: boolean;
    hasNextPage: boolean;
    prevPage: number | null;
    nextPage: number | null;
  };
  code?: number;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

const api: AxiosInstance = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false, // Disable credentials by default; enable per-request if needed
});

let isRefreshing = false;
let failedQueue: FailedQueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else if (token) {
      resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = authService.getToken();

    if (token && config.headers) {
      (config.headers as AxiosRequestHeaders).Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response interceptor to handle new API format and refresh token on 401 error
api.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    // Handle successful responses with new format
    if (response.data && typeof response.data === "object") {
      // If it's our standard API format, pass it through
      if ("success" in response.data) {
        return response;
      }

      // For legacy responses, wrap them in standard format
      const standardResponse: ApiResponse = {
        success: true,
        message: "Operation completed successfully",
        data: response.data,
      };
      response.data = standardResponse;
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    // Handle standardized error responses
    if (error.response?.data && typeof error.response.data === "object") {
      const errorData = error.response.data as any;

      // If it's already in our standard format, extract the message
      if ("success" in errorData && !errorData.success) {
        const standardError = new Error(
          errorData.message || "An error occurred"
        );
        (standardError as any).response = error.response;
        (standardError as any).code = errorData.code || error.response.status;
        (standardError as any).errors = errorData.errors;

        // Don't retry for client errors (400-499) except 401
        if (
          error.response.status !== 401 &&
          error.response.status >= 400 &&
          error.response.status < 500
        ) {
          return Promise.reject(standardError);
        }
      }
    }

    // Handle 401 errors with token refresh
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !(originalRequest.url || "").includes("/auth/refresh") &&
      !(originalRequest.url || "").includes("/auth/login") &&
      !(originalRequest.url || "").includes("/auth/sign-in") &&
      !(originalRequest.url || "").includes("/auth/register") &&
      !(originalRequest.url || "").includes("/auth/login-with-otp")
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (token && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        // Use the authService refresh method
        const success = await authService.refreshToken();

        if (success) {
          const newAccessToken = authService.getToken();

          if (newAccessToken) {
            api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
            processQueue(null, newAccessToken);

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            }

            return api(originalRequest);
          } else {
            throw new Error("No access token after refresh");
          }
        } else {
          throw new Error("Token refresh failed");
        }
      } catch (refreshError) {
        processQueue(refreshError, null);

        // Only logout if it's a real authentication failure, not a network issue
        if (refreshError instanceof Error) {
          const errorMessage = refreshError.message.toLowerCase();
          if (
            errorMessage.includes("network") ||
            errorMessage.includes("timeout") ||
            errorMessage.includes("connection")
          ) {
            // Network error, don't logout - let the request fail
            console.warn(
              "Network error during token refresh, not logging out:",
              refreshError
            );
          } else {
            // Real auth failure, logout
            console.error(
              "Authentication failure during token refresh, logging out:",
              refreshError
            );
            authService.logout();
          }
        } else {
          // Unknown error, logout for safety
          console.error(
            "Unknown error during token refresh, logging out:",
            refreshError
          );
          authService.logout();
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Create standardized error for non-API errors
    const message =
      (error.response?.data as any)?.message ||
      error.message ||
      "An unexpected error occurred";

    const standardError = new Error(message);
    (standardError as any).response = error.response;
    (standardError as any).code = error.response?.status || 500;

    return Promise.reject(standardError);
  }
);

export default api;
