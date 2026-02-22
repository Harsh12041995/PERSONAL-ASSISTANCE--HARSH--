export type UserRole =
  | "admin"
  | "manager"
  | "site_engineer"
  | "site_supervisor"
  | "head"
  | "user";

export interface RoleInfo {
  _id: string;
  id?: string; // For compatibility, some APIs might return 'id'
  name: string;
  description?: string;
  permissions?: any;
  status?: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  _id: string; // MongoDB ObjectId as string
  id?: string; // For compatibility, some APIs might return 'id'
  name: string;
  email: string;
  mobile?: string; // Optional as per backend validation
  role: string | RoleInfo; // Can be role ID or populated role object
  isEmailVerified: boolean;
  lastLoginAt?: string | Date;
  status: "active" | "inactive";
  createdAt: string | Date;
  updatedAt: string | Date;
  profileImage?: string; // Optional profile picture URL
  designation?: string; // Additional field from backend DTO
  department?: string; // Additional field from backend DTO
}

export interface CreateUserRequest {
  name: string;
  email?: string; // Either email or mobile required
  mobile?: string; // Either email or mobile required
  password: string; // Required for admin user creation
  role: string; // Role ID (MongoDB ObjectId as string)
  designation?: string;
  department?: string;
  status?: "active" | "inactive";
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  mobile?: string;
  password?: string; // For password updates
  role?: string; // Role ID (MongoDB ObjectId as string)
  status?: "active" | "inactive";
  designation?: string;
  department?: string;
}

// Login/Registration related types
export interface LoginCredentials {
  email?: string;
  mobile?: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email?: string;
  mobile?: string;
  password: string;
  role: string; // Role ID
}

export interface AuthTokens {
  access: {
    token: string;
    expires: string;
  };
  refresh: {
    token: string;
    expires: string;
  };
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// Password management types
export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
}

export interface SetPasswordData {
  token: string;
  password: string;
}

// OTP related types
export interface OTPLoginData {
  mobile: string;
  otp: string;
}

export interface SendOTPData {
  mobile: string;
}

// User filter and pagination types
export interface UserFilterParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  name?: string;
  role?: string;
  status?: "active" | "inactive";
  email?: string;
  mobile?: string;
  populate?: string;
}

// API Response types
export interface UserListResponse {
  users: User[];
  totalDocs: number;
  pagination?: {
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    nextPage: number | null;
    prevPage: number | null;
  };
}
