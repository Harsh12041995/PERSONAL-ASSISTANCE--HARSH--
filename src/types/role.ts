export type PermissionType = 'create' | 'read' | 'update' | 'deactivate' | 'activate';

export interface UserDetail {
  _id: string;
  name: string;
  email: string;
  mobile?: string;
  status: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface Role {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  permissions: {
    [module: string]: PermissionType[];
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  allowOtpLogin?: boolean;
  allowedOtpMethods?: string[];
  __v?: number;
  // User information when includeUsers=true
  userCount?: number;
  userDetails?: UserDetail[];
}

export interface CreateRoleData {
  name: string;
  description?: string;
  permissions: {
    [module: string]: PermissionType[];
  };
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
  permissions?: {
    [module: string]: PermissionType[];
  };
  isActive?: boolean;
}

export interface PermissionConfig {
  modules: Array<{ key: string; name: string }>;
  actions: Array<{ key: string; name: string }>;
}
