import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/authService";

interface ProtectedRouteProps {
  children: React.ReactNode;
  module?: string;
  action?: string;
}

export default function ProtectedRoute({
  children,
  module,
  action,
}: ProtectedRouteProps) {
  const { token, permissions, hasPermission, isLoading, isInitialized } =
    useAuth();
  const location = useLocation();

  // Show loading state while authentication is initializing
  if (isLoading || !isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Initializing authentication...
          </p>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  if (!token) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // Check permissions if module and action are provided
  if (module && action && !hasPermission(module, action)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
